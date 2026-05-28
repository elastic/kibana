/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
  QUERY_TYPE_STATS,
  type KiOriginKind,
  type KnowledgeIndicatorAttachmentData,
} from '@kbn/streams-schema';
import type { GetScopedClients } from '../../routes/types';

/**
 * Returns true for queries that should not surface as KIs. Mirrors the
 * filter applied in `listQueryItems` so the crawl, picker, attach, and
 * resolve paths agree on what constitutes a KI-eligible query.
 */
export const isExcludedQueryLink = (link: {
  rule_backed?: boolean;
  query: { type?: string };
}): boolean => link.rule_backed !== true || link.query.type === QUERY_TYPE_STATS;

/**
 * Returns true for features that should not surface as KIs. Mirrors the
 * `buildFeatureBaseFilters({ includeExpired: false, includeExcluded: false })`
 * semantics applied in the listing path so a chat snapshot pointing at a
 * since-excluded or since-expired feature fails closed at attach time.
 */
export const isExcludedFeature = (feature: {
  excluded_at?: string;
  expires_at?: string;
}): boolean => {
  if (feature.excluded_at) {
    return true;
  }
  if (feature.expires_at && Date.parse(feature.expires_at) < Date.now()) {
    return true;
  }
  return false;
};

/**
 * Resolve a KI origin into the attachment data the chat surface and the SML
 * `toAttachment` path both consume. Centralized so the picker, the chat
 * resolver, and `isStale` apply the same per-stream visibility check and the
 * same expired/excluded filter.
 *
 * Per-stream visibility is enforced via `streamsClient.getStream()`; the
 * SML-level permission check only validates the Streams feature-level
 * `read_stream` privilege, which is too coarse for per-instance access.
 */
export const resolveKnowledgeIndicatorAttachmentData = async (
  kind: KiOriginKind,
  id: string,
  request: KibanaRequest,
  getScopedClients: GetScopedClients,
  logger: Logger
): Promise<KnowledgeIndicatorAttachmentData | undefined> => {
  const { streamsClient, getFeatureClient, getQueryClient } = await getScopedClients({ request });

  if (kind === KI_ORIGIN_KIND_FEATURE) {
    const featureClient = await getFeatureClient();
    const [resolved] = await featureClient.findFeaturesByUuids([id]);
    if (!resolved) {
      return undefined;
    }
    try {
      await streamsClient.getStream(resolved.stream_name);
    } catch (error) {
      logger.debug(
        `KI attachment: stream '${resolved.stream_name}' not accessible to caller: ${
          (error as Error).message
        }`
      );
      return undefined;
    }
    try {
      const feature = await featureClient.getFeature(resolved.stream_name, id);
      if (isExcludedFeature(feature)) {
        return undefined;
      }
      return {
        kind: KI_ORIGIN_KIND_FEATURE,
        feature,
        stream_name: resolved.stream_name,
      };
    } catch (error) {
      logger.debug(
        `KI attachment: feature '${id}' not retrievable for caller: ${(error as Error).message}`
      );
      return undefined;
    }
  }

  const queryClient = await getQueryClient();
  const [link] = await queryClient.findQueryLinksByUuids([id]);
  if (!link || isExcludedQueryLink(link)) {
    return undefined;
  }
  try {
    await streamsClient.getStream(link.stream_name);
  } catch (error) {
    logger.debug(
      `KI attachment: stream '${link.stream_name}' not accessible to caller: ${
        (error as Error).message
      }`
    );
    return undefined;
  }

  return {
    kind: KI_ORIGIN_KIND_QUERY,
    query: link.query,
    stream_name: link.stream_name,
    rule: {
      backed: link.rule_backed,
      id: link.rule_id,
    },
  };
};
