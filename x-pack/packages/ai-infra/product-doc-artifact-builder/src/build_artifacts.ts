/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { ProductName } from '@kbn/product-doc-common';
import {
  // checkConnectivity,
  createTargetIndex,
  extractDocumentation,
  indexDocuments,
  installElser,
  createChunkFiles,
  createArtifact,
  cleanupFolders,
  deleteIndex,
  processDocuments,
} from './tasks';
import type { TaskConfig } from './types';

const getSourceClient = (config: TaskConfig) => {
  return new Client({
    compression: true,
    nodes: [config.sourceClusterUrl],
    sniffOnStart: false,
    auth: {
      username: config.sourceClusterUsername,
      password: config.sourceClusterPassword,
    },
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

  log.info('Ensuring ELSER is installed on the embedding cluster');
  await installElser({ client: embeddingClient });

  for (const productName of config.productNames) {
    await buildArtifact({
      productName,
      stackVersion: config.stackVersion,
      buildFolder: config.buildFolder,
      targetFolder: config.targetFolder,
      sourceClient,
      embeddingClient,
      log,
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
}: {
  productName: ProductName;
  stackVersion: string;
  buildFolder: string;
  targetFolder: string;
  sourceClient: Client;
  embeddingClient: Client;
  log: ToolingLog;
}) => {
  log.info(`Starting building artifact for product [${productName}] and version [${stackVersion}]`);

  const targetIndex = getTargetIndexName({ productName, stackVersion });

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
  });

  await deleteIndex({
    indexName: targetIndex,
    client: embeddingClient,
    log,
  });

  log.info(`Finished building artifact for product [${productName}] and version [${stackVersion}]`);
};

const getTargetIndexName = ({
  productName,
  stackVersion,
}: {
  productName: string;
  stackVersion: string;
}) => {
  return `kb-artifact-builder-${productName}-${stackVersion}`.toLowerCase();
};
