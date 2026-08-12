/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

/**
 * Code-registered system templates.
 *
 * These are Elastic-managed baseline templates provided out of the box for POC use.
 * User-authored templates (stored per-space in a dedicated index) are a separate registry
 * that will be added in the template CRUD milestone.
 *
 * Insertion order of each template's `fields` object is significant — the UI must render
 * fields in declaration order (RFC success criteria).
 *
 * Both templates exercise every input_type and constraint supported by the engine:
 *   SELECT (with options), TEXT (with max_length + regex), NUMBER (with min/max),
 *   DATE, TOGGLE, TEXT_ARRAY (with max_length), USER.
 */
export const CONVERSATION_TEMPLATES: ReadonlyArray<ConversationTemplate> = [
  {
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
  },
  {
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
  },
];
