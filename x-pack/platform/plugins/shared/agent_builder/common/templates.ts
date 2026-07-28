/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const CONVERSATION_TEMPLATES: ReadonlyArray<ConversationTemplate> = [
  {
    id: 'security-alert-triage',
    name: 'Alert Triage',
    description:
      'Investigate a security alert — gather affected host, user, severity, and MITRE tactic to drive a structured triage workflow.',
    definition: {
      fields: [
        {
          name: 'alert_id',
          type: 'keyword',
          description: 'ID of the alert being investigated (e.g. Elastic SIEM alert UUID).',
        },
        {
          name: 'severity',
          type: 'keyword',
          description: 'Assessed severity of the alert: critical, high, medium, or low.',
          validation: { allowed_values: ['critical', 'high', 'medium', 'low'] },
        },
        {
          name: 'affected_host',
          type: 'keyword',
          description: 'Hostname or IP of the primary affected system.',
        },
        {
          name: 'affected_user',
          type: 'keyword',
          description: 'Username or account involved in the alert, if known.',
        },
        {
          name: 'mitre_tactic',
          type: 'keyword',
          description:
            'Top-level MITRE ATT&CK tactic (e.g. Initial Access, Lateral Movement, Exfiltration).',
        },
        {
          name: 'disposition',
          type: 'keyword',
          description: 'Triage outcome: true_positive, false_positive, or benign_positive.',
          validation: { allowed_values: ['true_positive', 'false_positive', 'benign_positive'] },
        },
      ],
    },
  },
  {
    id: 'incident-response',
    name: 'Incident Response',
    description:
      'Drive an active incident — track scope, affected systems, containment status, and timeline for a coordinated response.',
    definition: {
      fields: [
        {
          name: 'incident_id',
          type: 'keyword',
          description: 'Incident ticket or case ID (e.g. INC-1234).',
        },
        {
          name: 'severity',
          type: 'keyword',
          description: 'Incident severity: P1 (critical), P2 (high), P3 (medium), or P4 (low).',
          validation: { allowed_values: ['P1', 'P2', 'P3', 'P4'] },
        },
        {
          name: 'attack_vector',
          type: 'keyword',
          description:
            'Initial access vector or root cause (e.g. phishing, exposed credential, unpatched CVE).',
        },
        {
          name: 'affected_systems',
          type: 'text',
          description: 'Comma-separated list of hostnames or services confirmed as impacted.',
        },
        {
          name: 'containment_status',
          type: 'keyword',
          description: 'Current containment stage: uncontained, partial, or contained.',
          validation: { allowed_values: ['uncontained', 'partial', 'contained'] },
        },
        {
          name: 'lead_analyst',
          type: 'keyword',
          description: 'Name or username of the analyst leading this incident.',
        },
      ],
    },
  },
  {
    id: 'threat-hunt',
    name: 'Threat Hunt',
    description:
      'Run a proactive threat hunt — define the hypothesis, data sources, and hunt scope before searching for adversary activity.',
    definition: {
      fields: [
        {
          name: 'hypothesis',
          type: 'text',
          description:
            'The threat hypothesis being tested (e.g. "Adversary is using living-off-the-land binaries for persistence").',
          validation: { min_length: 10 },
        },
        {
          name: 'mitre_technique',
          type: 'keyword',
          description:
            'Primary MITRE ATT&CK technique ID being hunted (e.g. T1059.001 for PowerShell).',
        },
        {
          name: 'data_sources',
          type: 'text',
          description:
            'Comma-separated Elastic data sources or index patterns in scope (e.g. logs-endpoint.events.*, .ds-logs-system.*).',
        },
        {
          name: 'time_range',
          type: 'keyword',
          description:
            'Look-back period for the hunt (e.g. "last 7 days", "2024-06-01 to 2024-06-30").',
        },
        {
          name: 'hunt_status',
          type: 'keyword',
          description: 'Current status of the hunt: in_progress, completed, or escalated.',
          validation: { allowed_values: ['in_progress', 'completed', 'escalated'] },
        },
      ],
    },
  },
];
