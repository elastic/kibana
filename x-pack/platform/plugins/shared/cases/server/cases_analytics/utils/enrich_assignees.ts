/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DOC_TYPES } from '../content_index/constants';

const PROFILE_BATCH_SIZE = 100;

interface AssigneeProfile {
  username?: string | null;
  email?: string | null;
  full_name?: string | null;
}

/**
 * Enriches assignee objects in the content analytics index by fetching
 * username, email, and full_name from the Elasticsearch security user profiles
 * API and updating case documents in-place via updateByQuery.
 *
 * This is a best-effort, fire-and-forget operation. Failures — including when
 * the security API is unavailable or a profile no longer exists — are logged
 * as warnings and do not propagate.
 */
export async function enrichAssigneesInContentIndex({
  esClient,
  logger,
  destIndex,
  spaceId,
  owner,
  executionId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  destIndex: string;
  spaceId: string;
  owner: string;
  executionId: string;
}): Promise<void> {
  try {
    // 1. Aggregate all distinct assignee UIDs in this owner+space partition.
    const aggResponse = await esClient.search({
      index: destIndex,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { doc_type: DOC_TYPES.CASE } },
            { term: { owner } },
            { term: { space_ids: spaceId } },
            { exists: { field: 'assignees.uid' } },
          ],
        },
      },
      aggs: {
        uids: {
          terms: { field: 'assignees.uid', size: 10_000 },
        },
      },
    });

    const buckets = (
      aggResponse.aggregations?.uids as { buckets: Array<{ key: string }> } | undefined
    )?.buckets ?? [];

    if (buckets.length === 0) {
      return;
    }

    const uids = buckets.map((b) => b.key);

    // 2. Fetch user profiles in batches.
    const profileMap = new Map<string, AssigneeProfile>();

    for (let i = 0; i < uids.length; i += PROFILE_BATCH_SIZE) {
      const batch = uids.slice(i, i + PROFILE_BATCH_SIZE);
      try {
        const profileResponse = await esClient.security.getUserProfile({ uid: batch });
        for (const profile of profileResponse.profiles) {
          profileMap.set(profile.uid, {
            username: profile.user?.username,
            email: profile.user?.email,
            full_name: profile.user?.full_name,
          });
        }
      } catch (e) {
        logger.warn(
          `[enrich-assignees][${owner}/${spaceId}] Failed to fetch user profile batch`,
          {
            executionId,
            error: e,
            batchStart: i,
            tags: ['cai-enrich-assignees', destIndex],
          }
        );
      }
    }

    if (profileMap.size === 0) {
      return;
    }

    // 3. Update case docs via updateByQuery (fire-and-forget; best-effort).
    const profilesParam: Record<string, AssigneeProfile> = Object.fromEntries(profileMap);

    esClient
      .updateByQuery({
        index: destIndex,
        query: {
          bool: {
            filter: [
              { term: { doc_type: DOC_TYPES.CASE } },
              { term: { owner } },
              { term: { space_ids: spaceId } },
              { exists: { field: 'assignees.uid' } },
            ],
          },
        },
        script: {
          lang: 'painless',
          source: `
            if (ctx._source.assignees == null) { return; }
            for (int i = 0; i < ctx._source.assignees.size(); i++) {
              def uid = ctx._source.assignees[i].uid;
              if (uid != null && params.profiles.containsKey(uid)) {
                def p = params.profiles[uid];
                if (p.username != null) { ctx._source.assignees[i].username = p.username; }
                if (p.email != null)    { ctx._source.assignees[i].email    = p.email; }
                if (p.full_name != null){ ctx._source.assignees[i].full_name = p.full_name; }
              }
            }
          `,
          params: { profiles: profilesParam },
        },
        refresh: true,
        wait_for_completion: false,
      })
      .catch((e: Error) => {
        logger.warn(
          `[enrich-assignees][${owner}/${spaceId}] updateByQuery for assignee enrichment failed`,
          {
            executionId,
            error: e,
            tags: ['cai-enrich-assignees', destIndex],
          }
        );
      });

    logger.debug(
      `[enrich-assignees][${owner}/${spaceId}] Assignee enrichment dispatched for ${profileMap.size} profiles`,
      {
        executionId,
        profileCount: profileMap.size,
        uidCount: uids.length,
        tags: ['cai-enrich-assignees', destIndex],
      }
    );
  } catch (e) {
    // Best-effort: a failure here must not block the sync task.
    logger.warn(
      `[enrich-assignees][${owner}/${spaceId}] Assignee enrichment failed; uid-only data retained`,
      {
        executionId,
        error: e,
        tags: ['cai-enrich-assignees', destIndex],
      }
    );
  }
}
