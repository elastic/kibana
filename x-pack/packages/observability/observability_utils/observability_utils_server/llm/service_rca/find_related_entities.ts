/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient } from '@kbn/inference-plugin/server';
import { Logger } from '@kbn/logging';
import { ObservabilityElasticsearchClient } from '../../es/client/create_observability_es_client';
import {
  findRelatedEntitiesViaKeywordSearches,
  RelatedEntityFromSearchResults,
} from './find_related_entities_via_keyword_searches';
import { writeKeywordSearch } from './write_keyword_search';

export async function findRelatedEntities({
  connectorId,
  inferenceClient,
  start,
  end,
  index,
  esClient,
  entity,
  dataToAnalyzePrompt,
  logger,
  context,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  start: number;
  end: number;
  index: string | string[];
  esClient: ObservabilityElasticsearchClient;
  entity: Record<string, string>;
  dataToAnalyzePrompt: string;
  logger: Logger;
  context: string;
}): Promise<{
  values: Array<{ fragments: string[]; relationship: string }>;
  content: string;
  foundEntities: RelatedEntityFromSearchResults[];
}> {
  const { groupingFields, values } = await writeKeywordSearch({
    connectorId,
    inferenceClient,
    entity,
    dataToAnalyzePrompt,
    context,
  });

  const { content: relatedEntitiesContent, foundEntities } =
    await findRelatedEntitiesViaKeywordSearches({
      entity,
      connectorId,
      start,
      end,
      esClient,
      index,
      inferenceClient,
      values,
      groupingFields,
      logger,
      dataToAnalyzePrompt,
    });

  return {
    values,
    content: relatedEntitiesContent,
    foundEntities,
  };
}
