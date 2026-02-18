/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Feature } from '@kbn/streams-schema';
import { IntegrationSuggestionsPrompt, type IntegrationSuggestionFromAI } from './prompt';
import type {
  IntegrationSuggestionInput,
  IntegrationPackageInfo,
  IntegrationSuggestionOutput,
  SuggestIntegrationsResult,
  SuggestIntegrationsEngineOptions,
} from './types';

export type {
  IntegrationSuggestionInput,
  IntegrationPackageInfo,
  IntegrationSuggestionOutput,
  SuggestIntegrationsResult,
  SuggestIntegrationsEngineOptions,
} from './types';

export interface PackageSearchProvider {
  searchPackages(searchTerm?: string): Promise<IntegrationPackageInfo[]>;
}

/**
 * Suggests Fleet integrations for detected features using an AI reasoning agent.
 *
 * The agent analyzes the provided features, searches for relevant integrations
 * using the PackageSearchProvider, and returns suggestions with explanations.
 */
export async function suggestIntegrations({
  input,
  inferenceClient,
  packageSearchProvider,
  logger,
  signal,
  options = {},
}: {
  input: IntegrationSuggestionInput;
  inferenceClient: BoundInferenceClient;
  packageSearchProvider: PackageSearchProvider;
  logger: Logger;
  signal: AbortSignal;
  options?: SuggestIntegrationsEngineOptions;
}): Promise<SuggestIntegrationsResult> {
  const { streamName, features } = input;
  const { maxSteps } = options;

  if (features.length === 0) {
    logger.debug(`No features provided for integration suggestions on stream "${streamName}"`);
    return { streamName, suggestions: [] };
  }

  const featureMap = new Map<string, Feature>(features.map((f) => [f.id, f]));

  try {
    let finalSuggestions: IntegrationSuggestionFromAI[] = [];

    const promptInput = {
      stream_name: streamName,
      features_json: JSON.stringify(
        features.map((f) => ({
          id: f.id,
          type: f.type,
          title: f.title,
          properties: f.properties,
          confidence: f.confidence,
        })),
        null,
        2
      ),
    };

    const result = await executeAsReasoningAgent({
      inferenceClient,
      prompt: IntegrationSuggestionsPrompt,
      input: promptInput,
      maxSteps,
      toolCallbacks: {
        search_integrations: async (toolCall) => {
          const args = toolCall.function.arguments;
          const searchTerm = args.searchTerm as string | undefined;

          logger.debug(
            `[search_integrations] Searching for: ${searchTerm || '(all packages)'}`
          );

          try {
            const packages = await packageSearchProvider.searchPackages(searchTerm);

            const results = packages.map((pkg) => ({
              name: pkg.name,
              title: pkg.title,
              description: pkg.description,
              categories: pkg.categories,
            }));

            logger.debug(`[search_integrations] Found ${results.length} packages`);

            return {
              response: {
                packages: results,
                total: results.length,
              },
            };
          } catch (error) {
            logger.error(`Error searching integrations: ${error}`);
            return {
              response: {
                error: error instanceof Error ? error.message : 'Unknown error',
                packages: [],
                total: 0,
              },
            };
          }
        },

        finalize_suggestions: async (toolCall) => {
          const args = toolCall.function.arguments;
          logger.debug(`[finalize_suggestions] Received ${args.suggestions?.length || 0} suggestions`);

          finalSuggestions = (args.suggestions as IntegrationSuggestionFromAI[]) || [];

          return {
            response: {
              success: true,
              count: finalSuggestions.length,
            },
          };
        },
      },
      finalToolChoice: {
        type: 'function',
        function: 'finalize_suggestions',
      },
      abortSignal: signal,
    });

    // Extract suggestions from the returned tool calls if the callback wasn't executed
    // (this happens when finalToolChoice forces completion without calling the callback)
    if (finalSuggestions.length === 0 && result.toolCalls?.length) {
      const finalizeCall = result.toolCalls.find(
        (tc) => tc.function.name === 'finalize_suggestions'
      );
      if (finalizeCall) {
        const args = finalizeCall.function.arguments as {
          suggestions?: IntegrationSuggestionFromAI[];
        };
        finalSuggestions = args.suggestions || [];
        logger.debug(
          `[suggestIntegrations] Extracted ${finalSuggestions.length} suggestions from tool call`
        );
      }
    }

    const suggestions: IntegrationSuggestionOutput[] = finalSuggestions
      .filter((suggestion) => featureMap.has(suggestion.featureId))
      .map((suggestion) => {
        const feature = featureMap.get(suggestion.featureId)!;
        return {
          packageName: suggestion.packageName,
          featureId: suggestion.featureId,
          featureTitle: feature.title || feature.id,
          reason: suggestion.reason,
        };
      });

    logger.debug(
      `[suggestIntegrations] Returning ${suggestions.length} suggestions for stream "${streamName}"`
    );

    return {
      streamName,
      suggestions,
    };
  } catch (error) {
    logger.error(`Error in integration suggestion workflow: ${error}`);
    return {
      streamName,
      suggestions: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
