/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InboxAction } from '@kbn/inbox-common';

/**
 * Static seed data used while real persistence is being designed.
 * Swap with a storage-adapter-backed reader once the HITL action
 * schema stabilizes.
 */
export const STUB_INBOX_ACTIONS: InboxAction[] = [
  {
    id: 'inbox-action-001',
    title: 'Approve isolation of endpoint host-42',
    description:
      'Attack Discovery recommends isolating host-42 after detecting lateral movement from a compromised service account.',
    status: 'pending',
    source_app: 'securitySolution',
    source_id: 'attack-discovery-run-9f2a',
    requested_by: 'attack-discovery-agent',
    created_at: '2026-04-24T15:12:31.000Z',
  },
  {
    id: 'inbox-action-002',
    title: 'Confirm enrichment of 3 suspicious IPs',
    description:
      'The threat-intel agent has flagged three external IPs for enrichment via a paid feed. Confirm to proceed with the lookup.',
    status: 'pending',
    source_app: 'securitySolution',
    source_id: 'threat-intel-task-221',
    requested_by: 'threat-intel-agent',
    created_at: '2026-04-24T14:47:05.000Z',
  },
  {
    id: 'inbox-action-003',
    title: 'Close noisy rule: Unusual process for user',
    description:
      'The AI Assistant proposes disabling a noisy detection rule after 128 low-fidelity alerts over the last 24h.',
    status: 'pending',
    source_app: 'securitySolution',
    source_id: 'rule-tuning-proposal-11',
    requested_by: 'ai-assistant',
    created_at: '2026-04-24T13:02:44.000Z',
  },
  {
    id: 'inbox-action-004',
    title: 'Add example to golden dataset',
    description:
      'Evaluations agent wants to promote a recent trace into the golden dataset used for regression scoring.',
    status: 'approved',
    source_app: 'evals',
    source_id: 'trace-abcd-1234',
    requested_by: 'evals-agent',
    created_at: '2026-04-23T21:18:09.000Z',
  },
  {
    id: 'inbox-action-005',
    title: 'Escalate unresolved alert cluster to on-call',
    description:
      'Alert triage agent asks to page the on-call analyst about an unresolved cluster of 14 alerts.',
    status: 'rejected',
    source_app: 'securitySolution',
    source_id: 'alert-cluster-ee71',
    requested_by: 'triage-agent',
    created_at: '2026-04-23T18:30:00.000Z',
  },
];
