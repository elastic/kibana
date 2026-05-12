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
import { resolveConnectorId } from '../utils/resolve_connector_id';

export const aiPromptStepDefinition = (coreSetup: CoreSetup<InferenceWorkflowsStartDeps>) =>
  createServerStepDefinition({
    ...AiPromptStepCommonDefinition,
    handler: async (context) => {
      const [, { inference }] = await coreSetup.getStartServices();

      const resolvedConnectorId = await resolveConnectorId(
        context.config['connector-id'],
        inference,
        context.contextManager.getFakeRequest()
      );

      const chatModel = await inference.getChatModel({
        connectorId: resolvedConnectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: {
          temperature: context.input.temperature,
          maxRetries: 0,
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
