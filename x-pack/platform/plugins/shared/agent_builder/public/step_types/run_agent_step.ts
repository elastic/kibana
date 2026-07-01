/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, HttpStart } from '@kbn/core/public';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import type { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import {
  runAgentStepCommonDefinition,
  type RunAgentStepConfigSchema,
  type RunAgentStepInputSchema,
  type RunAgentStepOutputSchema,
  OutputSchema as RunAgentOutputSchema,
} from '../../common/step_types/run_agent_step';
import { createAgentIdSelectionHandler } from './agent_id_selection';

export const createRunAgentStepDefinition = (core: CoreSetup) => {
  let httpPromise: Promise<HttpStart> | null = null;

  const getHttp = async (): Promise<HttpStart> => {
    if (!httpPromise) {
      httpPromise = core.getStartServices().then(([coreStart]) => coreStart.http);
    }
    return httpPromise;
  };

  return createPublicStepDefinition<
    RunAgentStepInputSchema,
    RunAgentStepOutputSchema,
    RunAgentStepConfigSchema
  >({
    ...runAgentStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/product_agent').then(({ icon }) => ({
        default: icon,
      }))
    ),
    editorHandlers: {
      config: {
        'agent-id': {
          selection: createAgentIdSelectionHandler(getHttp),
        },
        'connector-id': {
          connectorIdSelection: {
            connectorTypes: ['inference.unified_completion', 'bedrock', 'gen-ai', 'gemini'],
            enableCreation: false,
          },
        },
      },
      dynamicSchema: {
        getOutputSchema: ({ input }: { input: z.infer<RunAgentStepInputSchema> }) => {
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
};
