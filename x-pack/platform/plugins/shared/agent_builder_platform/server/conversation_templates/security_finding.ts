/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const securityFindingTemplate: ConversationTemplate = {
  id: 'security-finding',
  version: 1,
  name: 'Security Finding',
  description: 'Structured output for a security finding.',
  fields: {
    severity: {
      input_type: 'SELECT',
      description: 'Severity of the finding.',
      required: true,
      options: ['low', 'medium', 'high', 'critical'],
    },
    summary: {
      input_type: 'TEXT',
      description: 'Brief description of the finding.',
      max_length: 2000,
      required: true,
    },
    status: {
      input_type: 'SELECT',
      description: 'Current status of the finding.',
      default_value: 'open',
      options: ['open', 'in_progress', 'remediated', 'accepted_risk', 'false_positive'],
    },
    assigned_to: {
      input_type: 'USER',
      description: 'User responsible for remediating this finding.',
    },
    detection_date: {
      input_type: 'DATE',
      description: 'ISO 8601 date/time when the finding was first detected.',
    },
    false_positive: {
      input_type: 'TOGGLE',
      description: 'Whether this finding has been determined to be a false positive.',
      default_value: false,
    },
    entities: {
      input_type: 'TEXT_ARRAY',
      description: 'Affected hosts, IPs, users, or other entities.',
    },
    mitre_ttps: {
      input_type: 'TEXT_ARRAY',
      description:
        'MITRE ATT&CK technique IDs (e.g. T1566, T1078). Format: T<four digits> or T<four digits>.<three digits>.',
    },
    cvss_score: {
      input_type: 'NUMBER',
      description: 'CVSS score for the finding.',
      min: 0,
      max: 10,
    },
  },
};
