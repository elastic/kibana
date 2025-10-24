/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DocumentAnalysis } from '@kbn/ai-tools';
import { sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { GenerateDataForSemanticSearchPrompt } from './generate_data_for_semantic_search_prompt';

export const generateSemanticSearchData = async ({
  analysis,
  inferenceClient,
  streamName,
}: {
  analysis: DocumentAnalysis;
  inferenceClient: BoundInferenceClient;
  streamName: string;
}) => {
  const response = await inferenceClient.prompt({
    input: {
      stream_name: streamName,
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true, dropUnmapped: false })
      ),
    },
    prompt: GenerateDataForSemanticSearchPrompt,
  });

  try {
    const parsed = JSON.parse(response.content);
    return {
      description: parsed.description || '',
      tags: parsed.tags || [],
    };
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      description: response.content,
      tags: [],
    };
  }
};
