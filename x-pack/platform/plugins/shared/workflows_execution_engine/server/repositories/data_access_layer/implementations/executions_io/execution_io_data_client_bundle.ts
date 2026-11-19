/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { WORKFLOWS_EXECUTIONS_IO_DATA_STREAM } from './constants';
import { ExecutionsIoDataClient } from './executions_io_data_client';
import type { ExecutionsIoClient } from './executions_io_data_client';
import { registerExecutionsIoDataStream } from './executions_io_data_stream';
import { createRetryingEsClient } from '../../../../lib/create_retrying_es_client';
import type { CreateDataClientDeps } from '../../types';
import { DataStreamMetadataManager } from '../data_stream/data_stream_metadata_manager';

/**
 * Registers and starts the IO data stream. Legacy `input` / `output` reads fall
 * back to the plain execution indexes inside {@link ExecutionsIoDataClient}.
 * This bundle is used to create a single instance of the {@link ExecutionsIoDataClient}
 */
export class ExecutionIoDataClientBundle {
  private esClient!: ElasticsearchClient;
  private metadataManager: DataStreamMetadataManager | undefined;

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(coreSetup: CoreSetup): Promise<void> {
    registerExecutionsIoDataStream(coreSetup, this.deps.dataRetention);
  }

  async initStart(coreStart: CoreStart): Promise<void> {
    await coreStart.dataStreams.initializeClient(WORKFLOWS_EXECUTIONS_IO_DATA_STREAM);

    this.esClient = createRetryingEsClient(
      coreStart.elasticsearch.client.asInternalUser,
      this.deps.logger
    );
    this.metadataManager = new DataStreamMetadataManager({
      esClient: this.esClient,
      dataStreamName: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
      logger: this.deps.logger,
    });
    await this.metadataManager.init();
  }

  async stop(): Promise<void> {
    this.metadataManager?.dispose();
  }

  createIoDataClient(): ExecutionsIoClient {
    if (!this.esClient || !this.metadataManager) {
      throw new Error(
        'ExecutionIoDataClientBundle.initStart() must complete before creating clients'
      );
    }

    return new ExecutionsIoDataClient({
      esClient: this.esClient,
      metadataManager: this.metadataManager,
      logger: this.deps.logger,
    });
  }
}
