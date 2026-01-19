/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isArtifactContentFilePath } from '@kbn/product-doc-common';
import { internalElserInferenceId } from '../../../../common/consts';
import type { ZipArchive } from '../utils/zip_archive';
import { isLegacySemanticTextVersion } from '../utils';

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

  for (let i = 0; i < contentEntries.length; i++) {
    const entryPath = contentEntries[i];
    log.debug(`Indexing content for entry ${entryPath}`);
    const contentBuffer = await archive.getEntryContent(entryPath);
    await indexContentFile({
      indexName,
      esClient,
      contentBuffer,
      legacySemanticText,
      inferenceId,
    });
  }

  log.debug(`Done populating index ${indexName}`);
};

const indexContentFile = async ({
  indexName,
  contentBuffer,
  esClient,
  legacySemanticText,
  elserInferenceId = internalElserInferenceId,
  inferenceId,
}: {
  indexName: string;
  contentBuffer: Buffer;
  esClient: ElasticsearchClient;
  legacySemanticText: boolean;
  elserInferenceId?: string;
  inferenceId?: string;
}) => {
  const fileContent = contentBuffer.toString('utf-8');
  const lines = fileContent.split('\n');

  const documents = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      return JSON.parse(line);
    })
    .map((doc) =>
      rewriteInferenceId({
        document: doc,
        inferenceId: inferenceId ?? elserInferenceId,
        legacySemanticText,
      })
    );

  const operations = documents.reduce((ops, document) => {
    ops!.push(...[{ index: { _index: indexName } }, document]);
    return ops;
  }, [] as BulkRequest['operations']);

  const response = await esClient.bulk({
    refresh: false,
    operations,
  });

  if (response.errors) {
    const error = response.items.find((item) => item.index?.error)?.index?.error ?? 'unknown error';
    throw new Error(`Error indexing documents: ${JSON.stringify(error)}`);
  }
};

const rewriteInferenceId = ({
  document,
  inferenceId,
  legacySemanticText,
}: {
  document: Record<string, any>;
  inferenceId: string;
  legacySemanticText: boolean;
}) => {
  const semanticFieldsRoot = legacySemanticText ? document : document._inference_fields;
  // we don't need to handle nested fields, we don't have any and won't.
  Object.values(semanticFieldsRoot ?? {}).forEach((field: any) => {
    if (field.inference) {
      field.inference.inference_id = inferenceId;
    }
  });
  return document;
};
