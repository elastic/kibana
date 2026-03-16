/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { runAgentStepCommonDefinition, RunAgentOutputSchema } from '../../common/step_types';

export const runAgentStepDefinition = createPublicStepDefinition({
  ...runAgentStepCommonDefinition,
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
          return RunAgentOutputSchema;
        }
        return RunAgentOutputSchema.extend({
          structured_output: fromJSONSchema(input.schema),
        });
      },
    },
  },
});
