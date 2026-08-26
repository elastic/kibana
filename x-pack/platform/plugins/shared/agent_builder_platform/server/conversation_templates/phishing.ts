/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const phishingTemplate: ConversationTemplate = {
  id: 'phishing',
  version: 1,
  name: 'Phishing Investigation',
  description: 'Use for investigating suspected phishing attempts.',
  fields: {
    status: {
      input_type: 'SELECT',
      description: 'Current investigation status.',
      default_value: 'open',
      required: true,
      options: ['open', 'in_progress', 'closed'],
    },
    severity: {
      input_type: 'SELECT',
      description: 'Severity of the phishing attempt.',
      default_value: 'medium',
      required: true,
      options: ['low', 'medium', 'high', 'critical'],
    },
    reported_by: {
      input_type: 'USER',
      description: 'User who reported the phishing attempt.',
    },
    sender_address: {
      input_type: 'TEXT',
      description: 'Email address of the suspected sender.',
      max_length: 320,
      regex: {
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        message: 'Must be a valid email address',
      },
    },
    subject_line: {
      input_type: 'TEXT',
      description: 'Subject line of the phishing email.',
      max_length: 998,
    },
    click_date: {
      input_type: 'DATE',
      description: 'ISO 8601 date/time when a link or attachment was clicked, if applicable.',
    },
    recipients_notified: {
      input_type: 'TOGGLE',
      description: 'Whether affected recipients have been notified.',
      default_value: false,
    },
    impacted_accounts: {
      input_type: 'TEXT_ARRAY',
      description:
        'Usernames or email addresses of accounts known to have interacted with the phishing content.',
      max_length: 320,
    },
    phishing_urls: {
      input_type: 'TEXT_ARRAY',
      description: 'Extracted URLs from the phishing email.',
      max_length: 2048,
    },
    cvss_score: {
      input_type: 'NUMBER',
      description: 'Optional CVSS score if a known vulnerability is involved.',
      min: 0,
      max: 10,
    },
  },
};
