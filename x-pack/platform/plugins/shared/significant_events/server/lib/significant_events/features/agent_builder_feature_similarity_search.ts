/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolsStart } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SearchSimilarFeaturesArguments, SimilarFeatureHit } from '@kbn/streams-ai';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import {
  featureSimilaritySearchResultSchema,
  findSimilarFeatures,
} from './feature_similarity_search';

export type FeatureSimilaritySearch = (
  args: SearchSimilarFeaturesArguments
) => Promise<SimilarFeatureHit[]>;

export const createFeatureSimilaritySearch = ({
  agentBuilderTools,
  request,
  kiClient,
  streamName,
  logger,
}: {
  agentBuilderTools?: ToolsStart;
  request?: KibanaRequest;
  kiClient: Pick<KnowledgeIndicatorClient, 'findFeatures'>;
  streamName: string;
  logger: Logger;
}): FeatureSimilaritySearch => {
  const directSearch: FeatureSimilaritySearch = (args) =>
    findSimilarFeatures({ kiClient, streamName, args });

  if (!agentBuilderTools || !request) {
    return directSearch;
  }

  return async (args) => {
    let execution: Awaited<ReturnType<ToolsStart['execute']>>;
    try {
      execution = await agentBuilderTools.execute({
        toolId: platformSignificantEventsTools.searchSimilarFeatures,
        toolParams: { stream_name: streamName, ...args },
        request,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Agent Builder feature similarity tool is unavailable; using direct search: ${message}`
      );
      return directSearch(args);
    }

    if (!execution.results && execution.prompt) {
      logger.warn(
        'Agent Builder feature similarity tool unexpectedly requested confirmation; using direct search'
      );
      return directSearch(args);
    }

    const errorResult = execution.results?.find((result) => result.type === ToolResultType.error);
    if (errorResult) {
      const data = errorResult.data as { message?: unknown };
      throw new Error(
        typeof data.message === 'string' ? data.message : 'Feature similarity search failed'
      );
    }

    const dataResult = execution.results?.find((result) => result.type === ToolResultType.other);
    const parsed = featureSimilaritySearchResultSchema.safeParse(dataResult?.data);
    if (!parsed.success || parsed.data.count !== parsed.data.features.length) {
      logger.warn(
        'Agent Builder feature similarity tool returned an invalid result; using direct search'
      );
      return directSearch(args);
    }

    return parsed.data.features;
  };
};
