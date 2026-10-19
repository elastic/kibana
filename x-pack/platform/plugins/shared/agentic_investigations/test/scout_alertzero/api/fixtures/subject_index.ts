/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/** Alias and write index the plugin's `StorageIndexAdapter` uses for subjects. */
const SUBJECT_INDEX_ALIAS = '.kibana-investigation-subject';
const SUBJECT_WRITE_INDEX = `${SUBJECT_INDEX_ALIAS}-000001`;

/** The client reports a status at either level depending on how it threw. */
interface EsError {
  message?: string;
  statusCode?: number;
  body?: { error?: { type?: string; reason?: string } };
  meta?: { statusCode?: number; body?: { error?: { type?: string; reason?: string } } };
}

const statusOf = (error: EsError | undefined): number | undefined =>
  error?.statusCode ?? error?.meta?.statusCode;

/**
 * The concurrent-create race, whichever API reported it, and nothing else. The index-template
 * API reports it as a plain `illegal_argument_exception` that only says "already exists".
 */
const isAlreadyExists = (error: EsError | undefined): boolean => {
  if (statusOf(error) !== 400) {
    return false;
  }
  const { type, reason } = error?.body?.error ?? error?.meta?.body?.error ?? {};
  return /already[ _]exists/i.test(`${type ?? ''} ${reason ?? ''} ${error?.message ?? ''}`);
};

const userMapping = {
  type: 'object' as const,
  properties: {
    username: { type: 'keyword' as const },
    fullName: { type: 'keyword' as const },
    email: { type: 'keyword' as const },
    profileUid: { type: 'keyword' as const },
  },
};

/**
 * Subjects are written only in-process (`getSubjectsClient(request).upsertSubjects`, used by the
 * routes that start an investigation), so there is no HTTP route a suite could seed them through.
 * These helpers seed subject documents straight into the index, the way the proposals suite
 * seeds proposals.
 *
 * Installs the same index template the plugin's `StorageIndexAdapter` does (the mapping mirrors
 * `server/subjects/storage/subject_storage.ts`). Without it, seeding against a not-yet-created
 * alias auto-creates a plain index of that name, which then collides with the adapter's alias.
 *
 * Only installed when there is none: Scout servers are shared between suites and workers, and
 * overwriting an existing template would replace the adapter's own versioned copy.
 */
let indexReady: Promise<void> | undefined;

const ensureSubjectIndex = (esClient: Client): Promise<void> => {
  if (!indexReady) {
    indexReady = esClient.indices
      .existsIndexTemplate({ name: SUBJECT_INDEX_ALIAS })
      .then((exists) => {
        if (exists) {
          return undefined;
        }
        return esClient.indices
          .putIndexTemplate({
            name: SUBJECT_INDEX_ALIAS,
            create: true,
            allow_auto_create: false,
            index_patterns: [`${SUBJECT_INDEX_ALIAS}-*`],
            template: {
              mappings: {
                dynamic: 'strict',
                properties: {
                  spaceId: { type: 'keyword' },
                  conversationId: { type: 'keyword' },
                  subjectType: { type: 'keyword' },
                  subjectId: { type: 'keyword' },
                  summary: { type: 'text' },
                  triggerType: { type: 'keyword' },
                  snapshot: { type: 'object', enabled: false },
                  slack: {
                    type: 'object',
                    properties: {
                      channel: { type: 'keyword' },
                      thread_ts: { type: 'keyword' },
                      status_message_ts: { type: 'keyword' },
                      permalink: { type: 'keyword', index: false },
                      seen_events: {
                        type: 'object',
                        properties: {
                          event_id: { type: 'keyword', index: false },
                          execution_id: { type: 'keyword', index: false },
                        },
                      },
                    },
                  },
                  createdAt: { type: 'date', format: 'strict_date_optional_time' },
                  updatedAt: { type: 'date', format: 'strict_date_optional_time' },
                  createdBy: userMapping,
                },
              },
              aliases: { [SUBJECT_INDEX_ALIAS]: { is_write_index: true } },
            },
          })
          .catch((error: EsError) => {
            // Another worker installed it first: the same outcome as finding one there.
            if (isAlreadyExists(error)) {
              return;
            }
            throw error;
          });
      })
      .then(() =>
        esClient.indices.create({ index: SUBJECT_WRITE_INDEX }).catch((error: EsError) => {
          if (isAlreadyExists(error)) {
            return;
          }
          throw error;
        })
      )
      .then(() => undefined);
  }
  return indexReady;
};

export interface SeedSubjectOptions {
  conversationId: string;
  type: 'alert' | 'significant_event' | 'manual' | 'slack_thread';
  id: string;
  summary?: string;
  /** Space the document is written for. Defaults to the default Space. */
  spaceId?: string;
}

/**
 * Seeds one subject document shaped like `SubjectsService.upsertSubjects` writes it, without the
 * conversation attachment: the query API starts from the index, and a document that was never
 * attached stays visible.
 */
export const seedSubject = async (
  esClient: Client,
  { conversationId, type, id, summary, spaceId = 'default' }: SeedSubjectOptions
): Promise<void> => {
  await ensureSubjectIndex(esClient);
  const now = new Date().toISOString();
  await esClient.index({
    index: SUBJECT_INDEX_ALIAS,
    id: `scout-${spaceId}-${conversationId}-${type}-${id}`,
    refresh: true,
    document: {
      spaceId,
      conversationId,
      subjectType: type,
      subjectId: id,
      ...(summary !== undefined && { summary }),
      createdAt: now,
      updatedAt: now,
    },
  });
};

/**
 * Removes the subject documents of the given investigations. Leaves the write index and the
 * template in place: both are the application's own, shared with every other suite and worker.
 */
export const cleanupSubjects = async (esClient: Client, conversationIds: string[]) => {
  const ids = conversationIds.filter(Boolean);
  if (ids.length === 0) {
    return;
  }
  try {
    await esClient.deleteByQuery({
      index: SUBJECT_INDEX_ALIAS,
      refresh: true,
      conflicts: 'proceed',
      query: { terms: { conversationId: ids } },
    });
  } catch (error) {
    if (statusOf(error as EsError) !== 404) {
      throw error;
    }
  }
  // The next suite in this worker re-runs the readiness check.
  indexReady = undefined;
};
