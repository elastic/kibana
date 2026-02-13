/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Feature, Streams, System } from '@kbn/streams-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { FormattedDocumentAnalysis } from '@kbn/ai-tools';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { dateRangeQuery, fromKueryExpression, getKqlFieldNamesFromExpression } from '@kbn/es-query';
import { withSpan } from '@kbn/apm-utils';
import { createGenerateSignificantEventsPrompt } from './prompt';
import type { SignificantEventType } from './types';
import { sumTokens } from '../helpers/sum_tokens';
import { getComputedFeatureInstructions } from '../features/computed';

interface Query {
  kql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

/**
 * Given a list of field names extracted from a KQL expression and a set of
 * mapped fields, returns the subset of field names that do not match any
 * mapped field. Wildcard patterns (e.g. `server.*`) are matched against all
 * mapped fields using regex conversion.
 */
export const getUnmappedFields = (fieldNames: string[], mappedFields: Set<string>): string[] => {
  return fieldNames.filter((fieldName) => {
    if (fieldName.includes('*')) {
      const regex = new RegExp('^' + fieldName.replace(/\*/g, '.*') + '$');
      return !Array.from(mappedFields).some((mapped) => regex.test(mapped));
    }
    return !mappedFields.has(fieldName);
  });
};

/**
 * Generate significant event definitions, based on:
 * - the description of the system (or stream if system is undefined)
 * - dataset analysis
 * - for the given significant event types
 */
export async function generateSignificantEvents({
  stream,
  system,
  features,
  start,
  end,
  esClient,
  inferenceClient,
  signal,
  sampleDocsSize,
  systemPrompt,
  logger,
}: {
  stream: Streams.all.Definition;
  system?: System;
  features: Feature[];
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  sampleDocsSize?: number;
  systemPrompt: string;
}): Promise<{
  queries: Query[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  logger.debug('Starting significant event generation');

  let formattedAnalysis: FormattedDocumentAnalysis | undefined;

  if (system?.filter) {
    logger.trace('Describing dataset for significant event generation (with filter)');
    const analysis = await withSpan('describe_dataset_for_significant_event_generation', () =>
      describeDataset({
        sampleDocsSize,
        start,
        end,
        esClient,
        index: stream.name,
        filter: conditionToQueryDsl(system.filter),
      })
    );
    formattedAnalysis = formatDocumentAnalysis(analysis, { dropEmpty: true });
  }

  const fieldCapsResponse = await esClient
    .fieldCaps({
      index: stream.name,
      fields: '*',
      index_filter: {
        bool: {
          filter: dateRangeQuery(start, end),
        },
      },
    })
    .catch((error) => {
      throw new Error(
        `Failure to retrieve mappings to determine field eligibility: ${error.message}`
      );
    });

  const mappedFields = new Set(Object.keys(fieldCapsResponse.fields));
  const prompt = createGenerateSignificantEventsPrompt({ systemPrompt });

  logger.trace('Generating significant events via reasoning agent');
  const response = await withSpan('generate_significant_events', () =>
    executeAsReasoningAgent({
      input: {
        name: system?.name || stream.name,
        dataset_analysis: formattedAnalysis ? JSON.stringify(formattedAnalysis) : '',
        description: system?.description || stream.description,
        features: JSON.stringify(
          features.map((feature) =>
            omit(feature, ['uuid', 'id', 'status', 'last_seen', 'expires_at'])
          )
        ),
        computed_feature_instructions: getComputedFeatureInstructions(),
      },
      maxSteps: 4,
      prompt,
      inferenceClient,
      toolCallbacks: {
        add_queries: async (toolCall) => {
          const queries = toolCall.function.arguments.queries;

          const queryValidationResults = queries.map((query) => {
            try {
              fromKueryExpression(query.kql);
            } catch (error) {
              return {
                query,
                valid: false,
                status: 'Failed to add',
                error: error.message,
              };
            }

            const fieldNames = getKqlFieldNamesFromExpression(query.kql);
            const unmappedFields = getUnmappedFields(fieldNames, mappedFields);

            if (unmappedFields.length > 0) {
              return {
                query,
                valid: false,
                status: 'Failed to add',
                error: `Query references unmapped fields: ${unmappedFields.join(
                  ', '
                )}. Use only fields that are tagged with (mapped) in the dataset_analysis.`,
              };
            }

            return {
              query,
              valid: true,
              status: 'Added',
              error: undefined,
            };
          });

          return {
            response: {
              queries: queryValidationResults,
            },
          };
        },
      },
      abortSignal: signal,
    })
  );

  const queries = response.input.flatMap((message) => {
    if (message.role === MessageRole.Tool) {
      return message.response.queries.flatMap((query) => {
        if (query.valid) {
          return [query.query];
        }
        return [];
      });
    }
    return [];
  });

  logger.debug(`Generated ${queries.length} significant event queries`);

  return {
    queries,
    tokensUsed: sumTokens(
      {
        prompt: 0,
        completion: 0,
        total: 0,
        cached: 0,
      },
      response.tokens
    ),
  };
}
