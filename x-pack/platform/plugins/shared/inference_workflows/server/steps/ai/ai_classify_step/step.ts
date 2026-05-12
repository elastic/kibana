/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageFieldWithRole } from '@langchain/core/messages';
import type { CoreSetup } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  buildClassificationRequestPart,
  buildDataPart,
  buildInstructionsPart,
  buildSystemPart,
} from './build_prompts';
import { validateModelResponse } from './validate_model_response';
import {
  AiClassifyStepCommonDefinition,
  buildStructuredOutputSchema,
} from '../../../../common/steps/ai';
import type { InferenceWorkflowsStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

export const aiClassifyStepDefinition = (coreSetup: CoreSetup<InferenceWorkflowsStartDeps>) =>
  createServerStepDefinition({
    ...AiClassifyStepCommonDefinition,
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

      const {
        input,
        categories,
        instructions,
        allowMultipleCategories = false,
        fallbackCategory,
        includeRationale = false,
      } = context.input;
      const responseZodSchema = buildStructuredOutputSchema(context.input);
      const modelInput: MessageFieldWithRole[] = [
        ...buildSystemPart(),
        ...buildDataPart(input),
        ...buildClassificationRequestPart({
          categories,
          allowMultipleCategories,
          fallbackCategory,
          includeRationale,
        }),
        ...buildInstructionsPart(instructions),
      ];

      const invocationResult = await chatModel
        .withStructuredOutput(responseZodSchema, {
          name: 'classify',
          includeRaw: true,
          method: 'json',
        })
        .invoke(modelInput, {
          signal: context.abortSignal,
        });

      validateModelResponse({
        modelResponse: invocationResult.parsed,
        expectedCategories: context.input.categories,
        fallbackCategory: context.input.fallbackCategory,
        responseMetadata: invocationResult.raw.response_metadata,
      });

      return {
        output: {
          ...invocationResult.parsed,
          metadata: invocationResult.raw.response_metadata,
        },
      };
    },
  });
