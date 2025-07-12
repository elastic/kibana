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
  elserInferenceId: string;
  logger: Logger;
  isServerlessPlatform: boolean;
}

interface CreateAndPopulateIndexOpts {
  indexName: string;
  mappings: any;
  manifest: any;
  archive: ZipArchive;
  esClient: ElasticsearchClient;
}

export class IndexManager {
  private readonly elserInferenceId: string;
  private readonly log: Logger;
  private readonly isServerlessPlatform: boolean;

  constructor({ elserInferenceId, logger, isServerlessPlatform }: IndexManagerOpts) {
    this.elserInferenceId = elserInferenceId;
    this.log = logger;
    this.isServerlessPlatform = isServerlessPlatform;
  }

  async createAndPopulateIndex({
    indexName,
    mappings,
    manifest,
    archive,
    esClient,
  }: CreateAndPopulateIndexOpts): Promise<void> {
    if (this.elserInferenceId === defaultInferenceEndpoints.ELSER) {
      await ensureDefaultElserDeployed({
        client: esClient,
      });
    }

    const params = {
      indexName,
      legacySemanticText: isLegacySemanticTextVersion(manifest.formatVersion),
      esClient,
      elserInferenceId: this.elserInferenceId,
      log: this.log,
    };

    await createIndex({
      ...params,
      mappings,
      isServerless: this.isServerlessPlatform,
    });

    await populateIndex({
      ...params,
      archive,
    });
  }

  async deleteIndex({
    indexName,
    esClient,
  }: {
    indexName: string;
    esClient: ElasticsearchClient;
  }): Promise<void> {
    try {
      await esClient.indices.delete(
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
}
