/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const quickNoteTemplate: ConversationTemplate = {
  id: 'quick-note',
  version: 1,
  name: 'Quick Note',
  description: 'Lightweight template for informal notes and follow-ups.',
  fields: {
    owner: {
      input_type: 'USER',
      description: 'Person responsible for following up on this note.',
    },
    resolved: {
      input_type: 'TOGGLE',
      description: 'Whether this note has been actioned.',
      default_value: false,
    },
    summary: {
      input_type: 'TEXT',
      description: 'One-sentence summary of the note.',
      max_length: 500,
      required: true,
    },
  },
};
