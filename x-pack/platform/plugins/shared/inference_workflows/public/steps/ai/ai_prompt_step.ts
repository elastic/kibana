/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { createInferenceConnectorIdSelection } from '@kbn/inference-connectors';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  AiPromptOutputSchema,
  AiPromptStepCommonDefinition,
  getStructuredOutputSchema,
} from '../../../common/steps/ai';

export const createAiPromptStepDefinition = (http: HttpSetup) =>
  createPublicStepDefinition({
    ...AiPromptStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/product_agent').then(({ icon }) => ({
        default: icon,
      }))
    ),
    editorHandlers: {
      config: {
        'connector-id': {
          connectorIdSelection: createInferenceConnectorIdSelection({
            getHttp: async () => http,
            featureId: 'ai_prompt',
          }),
        },
      },
      dynamicSchema: {
        getOutputSchema: ({ input }) => {
          if (!input.schema) {
            return AiPromptOutputSchema;
          }

          const zodSchema = fromJSONSchema(input.schema as Record<string, unknown>);

          if (!zodSchema) {
            return AiPromptOutputSchema;
          }

          return getStructuredOutputSchema(zodSchema);
        },
      },
    },
  });
