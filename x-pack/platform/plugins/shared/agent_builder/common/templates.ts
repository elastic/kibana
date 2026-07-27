/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const CONVERSATION_TEMPLATES: ReadonlyArray<ConversationTemplate> = [
  {
    id: 'bug-investigation',
    name: 'Bug Investigation',
    description: 'Investigate a bug report — sets context for root-cause analysis.',
    definition: {
      metadata: {
        type: 'bug',
        workflow: 'investigation',
        priority: 'high',
      },
    },
  },
  {
    id: 'feature-planning',
    name: 'Feature Planning',
    description: 'Plan a new feature — sets context for design and scoping discussions.',
    definition: {
      metadata: {
        type: 'feature',
        workflow: 'planning',
        phase: 'design',
      },
    },
  },
];
