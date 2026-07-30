/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { runLedgerDataStream } from './data_stream';

/**
 * Install / update the index template for the run ledger. Idempotent, and must
 * run before the first gated workflow executes: the gate writes to the ledger
 * with the workflow caller's own credentials, which cannot create the template.
 */
export const initializeRunLedgerTemplate = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  await DataStreamClient.initializeTemplate({
    dataStream: runLedgerDataStream,
    elasticsearchClient: esClient,
    logger,
  });
};
