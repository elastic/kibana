/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmPolicy } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { retryTransientEsErrors } from './retry_transient_es_errors';
import { DataStreamAdapter } from './data_stream_adapter';

interface CreateOrUpdateIlmPolicyOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  name: string;
  policy: IlmPolicy;
  dataStreamAdapter: DataStreamAdapter;
}
/**
 * Creates ILM policy if it doesn't already exist, updates it if it does
 */
export const createOrUpdateIlmPolicy = async ({
  logger,
  esClient,
  name,
  policy,
  dataStreamAdapter,
}: CreateOrUpdateIlmPolicyOpts) => {
  if (dataStreamAdapter.isUsingDataStreams()) return;

  logger.debug(`Installing ILM policy ${name}`);

  try {
    await retryTransientEsErrors(() => esClient.ilm.putLifecycle({ name, policy }), { logger });
  } catch (err) {
    logger.error(`Error installing ILM policy ${name} - ${err.message}`);
    throw err;
  }
};
