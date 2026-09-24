/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { AiPromptStepCommonDefinition } from '../../../../common/steps/ai';
import type { InferenceWorkflowsStartDeps } from '../../../types';
import { AI_PROMPT_FEATURE_ID } from '../ai_feature_ids';
import { resolveConnectorId } from '../utils/resolve_connector_id';

export const aiPromptStepDefinition = (coreSetup: CoreSetup<InferenceWorkflowsStartDeps>) =>
  createServerStepDefinition({
    ...AiPromptStepCommonDefinition,
    handler: async (context) => {
      const [, { inference, searchInferenceEndpoints }] = await coreSetup.getStartServices();

      const connectorIdByFeature = context.config['connector-id-by-feature'];
      const connectorId = context.config['connector-id'];
      const request = context.contextManager.getFakeRequest();

      let resolvedConnectorId: string;

      if (connectorIdByFeature) {
        if (connectorId) {
          throw new Error(
            'Cannot specify both connector-id and connector-id-by-feature on an ai.prompt step.'
          );
        }
        if (!searchInferenceEndpoints) {
          throw new Error('searchInferenceEndpoints service is not available');
        }
        const feature = searchInferenceEndpoints.features.get(connectorIdByFeature);
        if (feature && feature.taskType !== 'chat_completion') {
          throw new Error(
            `Feature "${connectorIdByFeature}" is not a chat completion feature (task type "${feature.taskType}"). connector-id-by-feature requires a feature with task type "chat_completion".`
          );
        }
        const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
          connectorIdByFeature,
          request
        );
        if (endpoints.length === 0) {
          throw new Error(`No connector available for feature "${connectorIdByFeature}".`);
        }
        resolvedConnectorId = endpoints[0].connectorId;
      } else {
        resolvedConnectorId = await resolveConnectorId(connectorId, inference, request, {
          featureId: AI_PROMPT_FEATURE_ID,
          searchInferenceEndpoints,
        });
      }

      const reasoningLevel = context.config['reasoning-level'];
      const chatModel = await inference.getChatModel({
        connectorId: resolvedConnectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: {
          temperature: context.input.temperature,
          maxRetries: 0,
          ...(reasoningLevel !== undefined ? { reasoning: { effort: reasoningLevel } } : {}),
        },
      });
      const modelInput = [
        ...(context.input.systemPrompt
          ? [{ role: 'system', content: context.input.systemPrompt }]
          : []),
        {
          role: 'user',
          content: context.input.prompt,
        },
      ];

      if (context.input.schema) {
        const runnable = chatModel.withStructuredOutput(
          {
            type: 'object',
            properties: {
              // withStructuredOutput fails if outputSchema is not an object.
              // for example, if the user expects an array, we wrap it into an object here
              // and then unwrap it below
              response: context.input.schema,
            },
          },
          {
            name: 'extract_structured_response',
            includeRaw: true,
            method: 'jsonMode',
          }
        );

        const invocationResult = await runnable.invoke(modelInput, {
          signal: context.abortSignal,
        });
        return {
          // We modify the output to match the expected schema
          // For now, structured output flow does not output response_metadata,
          // so we only return the content here, but looking ahead we might have response_metadata returned,
          // so we keep the same output structure with potential response_metadata addition in the future.
          output: {
            content: invocationResult.parsed.response,
            metadata: invocationResult.raw.response_metadata,
          },
        };
      }

      const invocationResult = await chatModel.invoke(modelInput, {
        signal: context.abortSignal,
      });

      return {
        output: {
          content: invocationResult.content,
          metadata: invocationResult.response_metadata,
        },
      };
    },
  });
