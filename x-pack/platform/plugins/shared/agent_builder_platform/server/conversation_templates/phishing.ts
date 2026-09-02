/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const phishingTemplate: ConversationTemplate = {
  id: 'phishing',
  version: 2,
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
    indicators: {
      input_type: 'OBJECT_ARRAY',
      description:
        'Threat indicators extracted from the phishing email (IPs, domains, URLs, file hashes). ' +
        'Each element describes one indicator with its type, value, and when it was observed.',
      max_items: 50,
      properties: {
        type: {
          input_type: 'SELECT',
          description: 'Indicator category.',
          required: true,
          options: ['ip', 'domain', 'url', 'file_hash', 'email'],
        },
        value: {
          input_type: 'TEXT',
          description: 'Raw indicator value (e.g. "192.0.2.1", "evil.example.com").',
          required: true,
          max_length: 2048,
        },
        seen_at: {
          input_type: 'DATE',
          description: 'ISO 8601 date/time when this indicator was first observed.',
        },
        confidence: {
          input_type: 'SELECT',
          description: 'Confidence level in the indicator.',
          options: ['low', 'medium', 'high'],
        },
      },
    },
  },
};
