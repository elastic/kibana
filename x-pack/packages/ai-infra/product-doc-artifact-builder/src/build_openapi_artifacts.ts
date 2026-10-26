/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { DocumentationProduct } from '@kbn/product-doc-common';
import {
  downloadOpenAPISpecs,
  ingestOpenApiSpec,
  createOpenAPIChunkFiles,
  createCombinedOpenAPIArtifact,
} from './tasks/openapi';
import { cleanupFolders } from './tasks';
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

  // Configuration - use ELSER as default (required by OpenAPI mapping)
  const inferenceId = config.inferenceId ?? defaultInferenceEndpoints.ELSER;

  const products = [
    {
      productName: DocumentationProduct.elasticsearch,
      indexName: 'kibana_ai_openapi_spec_elasticsearch',
      spec: specs.elasticsearch,
    },
    {
      productName: DocumentationProduct.kibana,
      indexName: 'kibana_ai_openapi_spec_kibana',
      spec: specs.kibana,
    },
  ] as const;

  // Process each product: ingest, create chunk files
  for (const { productName, indexName, spec } of products) {
    log.info(`Processing and ingesting ${productName} OpenAPI spec`);

    await ingestOpenApiSpec({
      indexName,
      esClient: embeddingClient,
      openApiSpec: spec,
      logger: log,
      inferenceId,
    });

    await createOpenAPIChunkFiles({
      index: indexName,
      client: embeddingClient,
      destFolder: Path.join(config.buildFolder, productName),
      log,
      // inferenceId,
    });
  }

  // Create combined OpenAPI artifact
  await createCombinedOpenAPIArtifact({
    buildFolder: config.buildFolder,
    targetFolder: config.targetFolder,
    stackVersion: config.stackVersion,
    log,
    inferenceId,
  });

  await cleanupFolders({ folders: [config.buildFolder] });

  log.info(`Finished building OpenAPI artifacts for version [${config.stackVersion}]`);
};
