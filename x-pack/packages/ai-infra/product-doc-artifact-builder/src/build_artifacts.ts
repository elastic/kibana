/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import {
  Client as ElasticsearchClient8,
  HttpConnection as Elasticsearch8HttpConnection,
} from 'elasticsearch-8.x';

import { ToolingLog } from '@kbn/tooling-log';
import type { ProductName } from '@kbn/product-doc-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  // checkConnectivity,
  createTargetIndex,
  extractDocumentation,
  indexDocuments,
  createChunkFiles,
  createArtifact,
  cleanupFolders,
  deleteIndex,
  processDocuments,
} from './tasks';
import type { TaskConfig } from './types';
import { getSemanticTextMapping } from './tasks/create_index';

const getSourceClient = (config: TaskConfig) => {
  return new ElasticsearchClient8({
    compression: true,
    nodes: [config.sourceClusterUrl],
    sniffOnStart: false,
    auth: {
      username: config.sourceClusterUsername,
      password: config.sourceClusterPassword,
    },
    Connection: Elasticsearch8HttpConnection,
    requestTimeout: 30_000,
  });
};

const getEmbeddingClient = (config: TaskConfig) => {
  return new Client({
    compression: true,
    nodes: [config.embeddingClusterUrl],
    auth: {
      username: config.embeddingClusterUsername,
      password: config.embeddingClusterPassword,
    },
    // generating embeddings takes time
    requestTimeout: 10 * 60 * 1000,
    Connection: HttpConnection,
  });
};

export const buildArtifacts = async (config: TaskConfig) => {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  log.info(
    `Starting building artifacts for version=[${
      config.stackVersion
    }] and products=[${config.productNames.join(',')}]`
  );

  const sourceClient = getSourceClient(config);
  const embeddingClient = getEmbeddingClient(config);

  // log.info('Checking connectivity against clusters');
  // await checkConnectivity({ sourceClient, embeddingClient });

  await cleanupFolders({ folders: [config.buildFolder] });

  for (const productName of config.productNames) {
    await buildArtifact({
      productName,
      stackVersion: config.stackVersion,
      buildFolder: config.buildFolder,
      targetFolder: config.targetFolder,
      sourceClient,
      embeddingClient,
      log,
      inferenceId: config.inferenceId ?? defaultInferenceEndpoints.ELSER,
    });
  }

  await cleanupFolders({ folders: [config.buildFolder] });
};

const buildArtifact = async ({
  productName,
  stackVersion,
  buildFolder,
  targetFolder,
  embeddingClient,
  sourceClient,
  log,
  inferenceId,
}: {
  productName: ProductName;
  stackVersion: string;
  buildFolder: string;
  targetFolder: string;
  sourceClient: ElasticsearchClient8;
  embeddingClient: Client;
  log: ToolingLog;
  inferenceId: string;
}) => {
  log.info(
    `Starting building artifact for product [${productName}] and version [${stackVersion}] with inference id [${inferenceId}]`
  );

  const semanticTextMapping = getSemanticTextMapping(inferenceId);

  log.info(
    `Detected semantic text mapping for Inference ID ${inferenceId}:\n ${JSON.stringify(
      semanticTextMapping,
      null,
      2
    )}`
  );

  const targetIndex = getTargetIndexName({
    productName,
    stackVersion,
    inferenceId: semanticTextMapping?.inference_id,
  });
  await deleteIndex({
    indexName: targetIndex,
    client: embeddingClient,
    log,
  });

  let documents = await extractDocumentation({
    client: sourceClient,
    index: 'search-docs-1',
    log,
    productName,
    stackVersion,
  });

  documents = await processDocuments({ documents, log });

  await createTargetIndex({
    client: embeddingClient,
    indexName: targetIndex,
    semanticTextMapping,
  });

  await indexDocuments({
    client: embeddingClient,
    index: targetIndex,
    documents,
    log,
  });

  await createChunkFiles({
    index: targetIndex,
    client: embeddingClient,
    productName,
    destFolder: Path.join(buildFolder, productName),
    log,
  });

  await createArtifact({
    buildFolder: Path.join(buildFolder, productName),
    targetFolder,
    productName,
    stackVersion,
    log,
    semanticTextMapping,
  });

  log.info(`Finished building artifact for product [${productName}] and version [${stackVersion}]`);
};

const getTargetIndexName = ({
  productName,
  stackVersion,
  inferenceId,
}: {
  productName: string;
  stackVersion: string;
  inferenceId?: string;
}) => {
  return `kb-artifact-builder-${productName}-${stackVersion}${
    inferenceId ? `-${inferenceId}` : ''
  }`.toLowerCase();
};
