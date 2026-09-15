/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import type {
  NightshiftAutomationAttributes,
  NightshiftTriggerRow,
  SignificantEventSeverity,
  SignificantEventStatus,
} from './types';

const ALL_SEVERITIES: SignificantEventSeverity[] = ['80-critical', '60-high', '40-medium', '20-low'];
const ALL_STATUSES: SignificantEventStatus[] = ['pending', 'open', 'closed', 'dismissed'];

function buildKqlCondition(row: Extract<NightshiftTriggerRow, { kind: 'significant_event' }>): string | undefined {
  const clauses: string[] = [];

  if (row.severities && row.severities.length > 0 && row.severities.length < ALL_SEVERITIES.length) {
    const terms = row.severities.map((s) => `"${s}"`).join(' OR ');
    clauses.push(`event.severity: (${terms})`);
  }

  if (row.statuses && row.statuses.length > 0 && row.statuses.length < ALL_STATUSES.length) {
    const terms = row.statuses.map((s) => `"${s}"`).join(' OR ');
    clauses.push(`event.status: (${terms})`);
  }

  if (row.streamNames && row.streamNames.length > 0) {
    const terms = row.streamNames.map((s) => `"${s}"`).join(' OR ');
    clauses.push(`event.stream_names: (${terms})`);
  }

  return clauses.length > 0 ? clauses.join(' AND ') : undefined;
}

function buildConcurrencyKey(automation: NightshiftAutomationAttributes): string {
  const mode = automation.runtime.dedupeMode ?? 'event_id';
  switch (mode) {
    case 'rule_id':
      return '{{ event.rule.id }}';
    case 'none':
      return '{{ execution.id }}';
    case 'event_id':
    default:
      return '{{ event.event_id }}';
  }
}

/**
 * Generates a workflow YAML document from a nightshift automation config.
 *
 * Uses the yaml package to serialize all user-provided strings so that special
 * characters (newlines, colons, quotes) in prompt templates never corrupt the document.
 *
 * In the POC, only `significant_event` trigger rows are emitted — `alert` and `schedule`
 * rows are stored in the SO but not wired to the execution engine yet.
 */
export function generateWorkflowYaml(
  automationId: string,
  automation: NightshiftAutomationAttributes
): string {
  const sigEventRows = automation.trigger.rows.filter(
    (row): row is Extract<NightshiftTriggerRow, { kind: 'significant_event' }> =>
      row.kind === 'significant_event'
  );

  const triggers = sigEventRows.map((row) => {
    const condition = buildKqlCondition(row);
    if (condition) {
      return { type: 'significant-events.eventCreated', on: { condition } };
    }
    return { type: 'significant-events.eventCreated' };
  });

  // If no sig-event rows, emit a valid but non-firing workflow (manual trigger only).
  if (triggers.length === 0) {
    triggers.push({ type: 'manual' });
  }

  const dailyLimit = automation.runtime.dailyDispatchLimit ?? 20;
  const concurrencyKey = buildConcurrencyKey(automation);

  const workflowObj: Record<string, unknown> = {
    name: automation.name,
    enabled: automation.isEnabled,
    tags: ['nightshift', 'automation'],
    settings: {
      concurrency: {
        key: concurrencyKey,
        strategy: 'drop',
        max: 1,
      },
    },
    triggers,
    steps: [
      {
        name: 'check_budget',
        type: 'nightshift.checkBudget',
        with: {
          automation_id: automationId,
          daily_limit: dailyLimit,
        },
      },
      {
        name: 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        if: '${{ steps.check_budget.output.allowed }}',
        with: {
          subject_type: 'significant_event',
          subject_id: '{{ event.event_id }}',
          summary: '{{ event.title }}',
          trigger_type: 'automatic',
          concurrency_key: '{{ event.event_id }}',
          ...(automation.execution.promptTemplate
            ? { message: automation.execution.promptTemplate }
            : {}),
        },
      },
    ],
  };

  return stringify(workflowObj, { lineWidth: 0 });
}
