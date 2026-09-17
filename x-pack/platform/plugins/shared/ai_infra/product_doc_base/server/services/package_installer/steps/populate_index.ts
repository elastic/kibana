/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isArtifactContentFilePath } from '@kbn/product-doc-common';
import { internalElserInferenceId } from '../../../../common/consts';
import type { ZipArchive } from '../utils/zip_archive';
import { isLegacySemanticTextVersion, indexNdjsonEntry, rewriteInferenceId } from '../utils';

export const populateIndex = async ({
  esClient,
  indexName,
  manifestVersion,
  archive,
  log,
  inferenceId = internalElserInferenceId,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  manifestVersion: string;
  archive: ZipArchive;
  log: Logger;
  inferenceId?: string;
}) => {
  log.debug(`Starting populating index ${indexName}`);

  const legacySemanticText = isLegacySemanticTextVersion(manifestVersion);

  const contentEntries = archive.getEntryPaths().filter(isArtifactContentFilePath);

  for (const entryPath of contentEntries) {
    log.debug(`Indexing content for entry ${entryPath}`);
    await indexNdjsonEntry({
      archive,
      entryPath,
      indexName,
      esClient,
      transformDocument: (document) =>
        rewriteInferenceId({ document, inferenceId, legacySemanticText }),
    });
  }

  log.debug(`Done populating index ${indexName}`);
};
