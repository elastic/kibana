/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { DocumentResponse } from '../../../common/types/api';
import { MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import type { DocumentPair } from './validate_origin';

type AttachedDocument = DocumentResponse[number];

const toPairKey = (id: string, index: string): string => `${id}|${index}`;

/**
 * Whether Elasticsearch refused the search because the caller holds no privilege on the index.
 * A caller with no index privileges at all is refused the search action outright, so the same
 * "not readable" outcome arrives as an error instead of an empty result.
 */
const isUnauthorizedRead = (error: unknown): boolean => {
  const candidate = error as { statusCode?: number; body?: { error?: { type?: string } } };
  return candidate?.statusCode === 403 || candidate?.body?.error?.type === 'security_exception';
};

/**
 * Adds the concrete index of each attached alert that a selection names under an index other
 * than the one its attachment stores.
 *
 * Some attach paths (Attack Discovery, attacks) store the alerts alias as an alert's index, while
 * a selection carries the concrete `_index` of the hit. Searching each stored index as the caller
 * returns only documents that really live behind it, so a selection still cannot claim an index
 * its attachment does not reach.
 */
export const resolveAttachedAlertIndices = async ({
  selected,
  attached,
  esClient,
}: {
  selected: readonly DocumentPair[];
  attached: DocumentResponse;
  esClient: ElasticsearchClient;
}): Promise<DocumentResponse> => {
  const attachedPairs = new Set(attached.map(({ id, index }) => toPairKey(id, index)));
  const unmatchedIds = new Set(
    selected
      .filter(({ _id, _index }) => !attachedPairs.has(toPairKey(_id, _index)))
      .map(({ _id }) => _id)
  );
  if (unmatchedIds.size === 0) {
    return attached;
  }

  // An empty index would search every index, and a remote one would reach another cluster.
  const attachmentsByIndex = new Map<string, Map<string, AttachedDocument>>();
  for (const attachment of attached) {
    const { id, index } = attachment;
    if (unmatchedIds.has(id) && index.length > 0 && !isNonLocalIndexName(index)) {
      const attachmentsById = attachmentsByIndex.get(index) ?? new Map<string, AttachedDocument>();
      attachmentsById.set(id, attachment);
      attachmentsByIndex.set(index, attachmentsById);
    }
  }

  const resolved = await pMap(
    Array.from(attachmentsByIndex.entries()),
    async ([index, attachmentsById]): Promise<DocumentResponse> => {
      const ids = Array.from(attachmentsById.keys());
      try {
        const { hits } = await esClient.search({
          index,
          size: ids.length,
          query: { ids: { values: ids } },
          _source: false,
          track_total_hits: false,
          // A stored index that no longer resolves to anything is an alert that no longer exists.
          ignore_unavailable: true,
          allow_no_indices: true,
        });
        return hits.hits.flatMap(({ _id: hitId, _index: hitIndex }) => {
          const attachment = hitId != null ? attachmentsById.get(hitId) : undefined;
          return attachment !== undefined ? [{ ...attachment, index: hitIndex }] : [];
        });
      } catch (error) {
        if (isUnauthorizedRead(error)) {
          return [];
        }
        throw error;
      }
    },
    { concurrency: MAX_CONCURRENT_SEARCHES }
  );

  return [...attached, ...resolved.flat()];
};
