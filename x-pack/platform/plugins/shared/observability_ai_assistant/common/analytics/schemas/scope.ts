/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaValue } from '@kbn/core/public';
import type { AssistantScope } from '@kbn/ai-assistant-common';

export interface Scope {
  scopes: AssistantScope[];
}

export const scopeSchema: SchemaValue<AssistantScope[]> = {
  type: 'array',
  items: {
    type: 'text',
    _meta: {
      description: 'Scope of the AI Assistant',
    },
  },
};
