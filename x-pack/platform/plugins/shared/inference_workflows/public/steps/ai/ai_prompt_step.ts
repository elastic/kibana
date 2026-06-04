/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  AiPromptOutputSchema,
  AiPromptStepCommonDefinition,
  getStructuredOutputSchema,
} from '../../../common/steps/ai';

export const AiPromptStepDefinition = createPublicStepDefinition({
  ...AiPromptStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/product_agent').then(({ icon }) => ({
      default: icon,
    }))
  ),
  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: ['inference.unified_completion', 'bedrock', 'gen-ai', 'gemini'],
          enableCreation: false,
        },
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
