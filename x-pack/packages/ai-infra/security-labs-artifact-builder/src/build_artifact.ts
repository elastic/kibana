/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { isValidSecurityLabsVersion } from '@kbn/product-doc-common';
import {
  fetchContent,
  parseMarkdownFiles,
  createTargetIndex,
  indexDocuments,
  createChunkFiles,
  createArtifact,
  cleanupFolders,
  deleteIndex,
} from './tasks';
import type { TaskConfig } from './types';

const DEFAULT_ELSER = '.elser-2-elasticsearch';

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

export const buildArtifact = async (config: TaskConfig) => {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  // Validate version format
  if (!isValidSecurityLabsVersion(config.version)) {
    throw new Error(
      `Invalid version format: ${config.version}. Expected YYYY.MM.DD format (e.g., 2024.12.11)`
    );
  }

  log.info(`Starting Security Labs artifact build for version [${config.version}]`);

  const embeddingClient = getEmbeddingClient(config);
  const targetIndex = getTargetIndexName(config.version);

  await cleanupFolders({ folders: [config.buildFolder] });

  try {
    // Step 1: Fetch content from GitHub or local path
    log.info('Fetching Security Labs content...');
    const contentPath = await fetchContent({
      config,
      log,
    });

    // Step 2: Parse markdown files with frontmatter
    log.info('Parsing markdown files...');
    const documents = await parseMarkdownFiles({
      contentPath,
      log,
    });

    if (documents.length === 0) {
      throw new Error('No documents found to index');
    }

    log.info(`Found ${documents.length} Security Labs documents`);

    // Step 3: Delete existing index if present
    await deleteIndex({
      indexName: targetIndex,
      client: embeddingClient,
      log,
    });

    // Step 4: Create target index with ELSER semantic_text mapping
    await createTargetIndex({
      client: embeddingClient,
      indexName: targetIndex,
    });

    // Step 5: Index documents (generates embeddings)
    await indexDocuments({
      client: embeddingClient,
      index: targetIndex,
      documents,
      log,
    });

    // Step 6: Create chunk files from indexed documents
    const buildFolder = Path.join(config.buildFolder, 'security-labs');
    await createChunkFiles({
      index: targetIndex,
      destFolder: buildFolder,
      client: embeddingClient,
      log,
    });

    // Step 7: Package into artifact
    await createArtifact({
      buildFolder,
      targetFolder: config.targetFolder,
      version: config.version,
      log,
    });

    log.info(`Successfully built Security Labs artifact for version [${config.version}]`);
  } finally {
    // Cleanup
    await cleanupFolders({ folders: [config.buildFolder] });
  }
};

const getTargetIndexName = (version: string): string => {
  return `kb-security-labs-builder-${version}-${DEFAULT_ELSER}`.toLowerCase();
};
