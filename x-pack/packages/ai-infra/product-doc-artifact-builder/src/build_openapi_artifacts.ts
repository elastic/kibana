/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { DocumentationProduct } from '@kbn/product-doc-common';
import {
  downloadOpenAPISpecs,
  ingestOpenApiSpec,
  createOpenAPIChunkFiles,
  createCombinedOpenAPIArtifact,
} from './tasks/openapi';
import { cleanupFolders } from './tasks';
import { getSemanticTextMapping } from './tasks/create_index';
import type { OpenAPITaskConfig } from './types';

const getEmbeddingClient = (config: OpenAPITaskConfig) => {
  return new Client({
    compression: true,
    nodes: [config.embeddingClusterUrl],
    auth: {
      username: config.embeddingClusterUsername,
      password: config.embeddingClusterPassword,
    },
    requestTimeout: 10 * 60 * 1000,
    Connection: HttpConnection,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const buildOpenAPIArtifacts = async (config: OpenAPITaskConfig) => {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  log.info(`Starting building OpenAPI artifacts for version=[${config.stackVersion}]`);

  const embeddingClient = getEmbeddingClient(config);

  await cleanupFolders({ folders: [config.buildFolder] });

  // Download OpenAPI specs
  const specs = await downloadOpenAPISpecs({
    log,
    buildFolder: config.buildFolder,
  });

  // Index names
  const elasticsearchIndex = 'kibana_ai_openapi_spec_elasticsearch';
  const kibanaIndex = 'kibana_ai_openapi_spec_kibana';

  // Get semantic text mapping (using E5 small as specified in the mapping)
  const semanticTextMapping = getSemanticTextMapping(config.inferenceId);

  // Process and ingest Elasticsearch spec
  log.info('Processing and ingesting Elasticsearch OpenAPI spec');
  await ingestOpenApiSpec({
    indexName: elasticsearchIndex,
    esClient: embeddingClient,
    openApiSpec: specs.elasticsearch,
    logger: log,
  });

  // Create chunk files for Elasticsearch
  await createOpenAPIChunkFiles({
    index: elasticsearchIndex,
    client: embeddingClient,
    destFolder: Path.join(config.buildFolder, DocumentationProduct.elasticsearch),
    log,
  });

  // Process and ingest Kibana spec
  log.info('Processing and ingesting Kibana OpenAPI spec');
  await ingestOpenApiSpec({
    indexName: kibanaIndex,
    esClient: embeddingClient,
    openApiSpec: specs.kibana,
    logger: log,
  });

  // Create chunk files for Kibana
  await createOpenAPIChunkFiles({
    index: kibanaIndex,
    client: embeddingClient,
    destFolder: Path.join(config.buildFolder, DocumentationProduct.kibana),
    log,
  });

  // Create combined OpenAPI artifact
  await createCombinedOpenAPIArtifact({
    buildFolder: config.buildFolder,
    targetFolder: config.targetFolder,
    stackVersion: config.stackVersion,
    log,
    semanticTextMapping,
  });

  await cleanupFolders({ folders: [config.buildFolder] });

  log.info(`Finished building OpenAPI artifacts for version [${config.stackVersion}]`);
};
