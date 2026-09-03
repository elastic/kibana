/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const incidentTemplate: ConversationTemplate = {
  id: 'incident',
  version: 1,
  name: 'Incident',
  description: 'Use for incidents',
  fields: {
    status: {
      input_type: 'SELECT',
      description: 'Current incident status.',
      default_value: 'open',
      required: true,
      options: ['open', 'closed'],
    },
    severity: {
      input_type: 'SELECT',
      description: 'Severity of the incident.',
      required: false,
      options: ['low', 'medium', 'high', 'critical'],
    },
    assignees: {
      input_type: 'TEXT_ARRAY',
      required: false,
      description: 'List of user ids that are assigned to the incident.',
    },
    verdict: {
      input_type: 'TEXT',
      required: false,
      description: 'The outcome of the incident.',
      max_length: 10_000,
    },
    summary: {
      input_type: 'TEXT',
      required: false,
      description: 'Summary of the incident so far.',
      max_length: 10_000,
    },
    description: {
      input_type: 'TEXT',
      required: false,
      description: 'Single line summary of the incident so far',
    },
    close_reason: {
      input_type: 'SELECT',
      description: 'Reason the incident was closed.',
      required: false,
      options: ['false_positive', 'benign', 'resolved', 'duplicate', 'other'],
    },
    investigation_ids: {
      input_type: 'TEXT_ARRAY',
      description: 'A list of investigation ids that should be linked to the incident',
    },
  },
};
