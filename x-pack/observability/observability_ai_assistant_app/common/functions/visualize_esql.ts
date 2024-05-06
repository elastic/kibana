/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FromSchema } from 'json-schema-to-ts';
import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/common';
import { VISUALIZE_ESQL_USER_INTENTIONS } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';

export const visualizeESQLFunction = {
  name: 'visualize_query',
  visibility: FunctionVisibility.UserOnly,
  description: 'Use this function to visualize charts for ES|QL queries.',
  descriptionForUser: 'Use this function to visualize charts for ES|QL queries.',
  parameters: {
    type: 'object',
    additionalProperties: true,
    properties: {
      query: {
        type: 'string',
      },
      intention: {
        type: 'string',
        enum: VISUALIZE_ESQL_USER_INTENTIONS,
      },
    },
    required: ['query', 'intention'],
  } as const,
  contexts: ['core'],
};

export type VisualizeESQLFunctionArguments = FromSchema<typeof visualizeESQLFunction['parameters']>;
