/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  resolveDefaultInferenceIdFromInferenceGet,
  resolveInstalledProductDocInferenceId,
} from '@kbn/product-doc-common';
import { getInferenceIdFromWriteIndex } from './knowledge_base_service/get_inference_id_from_write_index';

/**
 * Inference ID of product documentation the assistant can search.
 * Prefers the environment default (and other built-in embedding models) so a
 * model switch does not keep querying documentation that was replaced.
 * Falls back to the knowledge base model when documentation was installed for a custom endpoint.
 */
export async function resolveObservabilityProductDocInferenceId({
  esClient,
  logger,
  isDocumentationAvailable,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  isDocumentationAvailable: (inferenceId: string) => Promise<boolean>;
}): Promise<string | undefined> {
  const installedDefault = await resolveInstalledProductDocInferenceId({
    getDefaultInferenceId: () =>
      resolveDefaultInferenceIdFromInferenceGet(() => esClient.asInternalUser.inference.get({})),
    isDocumentationAvailable,
  });
  if (installedDefault) {
    return installedDefault;
  }

  const knowledgeBaseInferenceId = await getInferenceIdFromWriteIndex(esClient, logger);
  if (knowledgeBaseInferenceId && (await isDocumentationAvailable(knowledgeBaseInferenceId))) {
    return knowledgeBaseInferenceId;
  }

  return undefined;
}
