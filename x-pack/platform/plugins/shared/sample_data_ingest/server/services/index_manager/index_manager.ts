/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  createIndex,
  populateIndex,
  ensureDefaultElserDeployed,
  isLegacySemanticTextVersion,
} from './utils';
import type { ZipArchive } from '../types';

interface IndexManagerOpts {
  esClient: ElasticsearchClient;
  elserInferenceId: string;
  logger: Logger;
}

interface CreateAndPopulateIndexOpts {
  indexName: string;
  mappings: any;
  manifest: any;
  archive: ZipArchive;
}

export class IndexManager {
  private esClient: ElasticsearchClient;
  private readonly elserInferenceId: string;
  private readonly log: Logger;

  constructor({ esClient, elserInferenceId, logger }: IndexManagerOpts) {
    this.esClient = esClient;
    this.elserInferenceId = elserInferenceId;
    this.log = logger;
  }

  async createAndPopulateIndex({
    indexName,
    mappings,
    manifest,
    archive,
  }: CreateAndPopulateIndexOpts): Promise<void> {
    if (this.elserInferenceId === defaultInferenceEndpoints.ELSER) {
      await ensureDefaultElserDeployed({
        client: this.esClient,
      });
    }

    const params = {
      indexName,
      legacySemanticText: isLegacySemanticTextVersion(manifest.formatVersion),
      esClient: this.esClient,
      elserInferenceId: this.elserInferenceId,
      log: this.log,
    };

    await createIndex({
      ...params,
      mappings,
    });

    await populateIndex({
      ...params,
      archive,
    });
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.esClient.indices.delete(
        {
          index: indexName,
        },
        { ignore: [404] }
      );
      this.log.debug(`Deleted index [${indexName}]`);
    } catch (error) {
      this.log.warn(`Failed to delete index [${indexName}]: ${error.message}`);
    }
  }

  setESClient(esClient: ElasticsearchClient): void {
    this.esClient = esClient;
  }
}
