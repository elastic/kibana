/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolSchema } from '@kbn/inference-common';

export const requestDocumentationSchema = {
  type: 'object',
  properties: {
    commands: {
      type: 'array',
      items: {
        type: 'string',
      },
      description:
        'ES|QL source and processing commands you want to analyze before generating the query.',
    },
    functions: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'ES|QL functions you want to analyze before generating the query.',
    },
  },
} satisfies ToolSchema;
