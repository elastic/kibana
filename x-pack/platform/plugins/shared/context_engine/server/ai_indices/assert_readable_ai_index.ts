/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { AiIndexNotReadableError } from './errors';
import { readableProbe, readableProbeFailure } from './readable_probe';

export interface AssertReadableAiIndexParams {
  esClient: ElasticsearchClient;
  aiIndex: AiIndexHttpItem;
}

/**
 * Throws `AiIndexNotReadableError` unless the caller can read the backing store, so describing an
 * AI Index takes the same privileges as listing it: the metadata reads behind a describe pass
 * `ignore_unavailable`, which turns an index the caller cannot see into an empty description rather
 * than a denial. Uses the list API's probe, whose per-item `msearch` error keeps the verdict ours.
 */
export const assertReadableAiIndex = async ({
  esClient,
  aiIndex,
}: AssertReadableAiIndexParams): Promise<void> => {
  const target = aiIndex.dest.value;
  // A refusal normally arrives as the probe's own response item, but Elasticsearch may also reject
  // the whole `msearch`; either way the denial is this AI Index's, so the error stays ours.
  const { responses } = await esClient
    .msearch({ searches: readableProbe(target) })
    .catch((error) => {
      if (isResponseError(error) && error.statusCode === 403) {
        throw new AiIndexNotReadableError(aiIndex.id, error.message);
      }
      throw error;
    });
  const failure = readableProbeFailure(target, responses[0]);
  if (failure !== undefined) {
    throw new AiIndexNotReadableError(aiIndex.id, failure);
  }
};
