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

// ---------------------------------------------------------------------------
// KQL escaping — wrap a literal value in quotes and escape embedded quotes
// ---------------------------------------------------------------------------
function kqlLiteral(value: string): string {
  // Escape backslash first, then double quotes
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// ---------------------------------------------------------------------------
// Significant-event trigger row → KQL condition
// ---------------------------------------------------------------------------
function buildSigEventCondition(
  row: Extract<NightshiftTriggerRow, { kind: 'significant_event' }>
): string | undefined {
  const clauses: string[] = [];

  if (row.severities && row.severities.length > 0 && row.severities.length < ALL_SEVERITIES.length) {
    const terms = row.severities.map((s) => kqlLiteral(s)).join(' OR ');
    clauses.push(`event.severity: (${terms})`);
  }

  if (row.statuses && row.statuses.length > 0 && row.statuses.length < ALL_STATUSES.length) {
    const terms = row.statuses.map((s) => kqlLiteral(s)).join(' OR ');
    clauses.push(`event.status: (${terms})`);
  }

  if (row.streamNames && row.streamNames.length > 0) {
    const terms = row.streamNames.map((s) => kqlLiteral(s)).join(' OR ');
    clauses.push(`event.stream_names: (${terms})`);
  }

  return clauses.length > 0 ? clauses.join(' AND ') : undefined;
}

// ---------------------------------------------------------------------------
// Alert trigger row → KQL condition for alerting.alertStateChanged
//
// Payload shape:
//   alert: { id, uuid, category: 'new' | 'recovered', actionGroup, start }
//   rule:  { id, name, spaceId, consumer, ruleTypeId, tags[] }
// ---------------------------------------------------------------------------
function buildAlertCondition(
  row: Extract<NightshiftTriggerRow, { kind: 'alert' }>
): string | undefined {
  const clauses: string[] = [];

  // Status filter: 'firing' maps to 'new', 'recovered' to 'recovered', 'any' → no clause
  // KQL field paths must use the event.* prefix — the execution context wraps the payload
  // as { event: { alert: {...}, rule: {...} } }, so KQL accesses event.alert.category etc.
  if (row.alertStatus === 'firing') {
    clauses.push('event.alert.category: "new"');
  } else if (row.alertStatus === 'recovered') {
    clauses.push('event.alert.category: "recovered"');
  }

  // Rule name filter — substring match via KQL wildcard
  if (row.ruleNamePattern) {
    if (row.ruleNameMatchMode === 'regex') {
      // KQL doesn't support regex. Fall back to substring/wildcard.
      const escaped = row.ruleNamePattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      clauses.push(`event.rule.name: "*${escaped}*"`);
    } else {
      // substring (default)
      const escaped = row.ruleNamePattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      clauses.push(`event.rule.name: "*${escaped}*"`);
    }
  }

  // Tag filter — rule.tags is an array; KQL "field: value" checks any element
  if (row.tags && row.tags.length > 0) {
    if (row.tags.length === 1) {
      clauses.push(`event.rule.tags: ${kqlLiteral(row.tags[0])}`);
    } else {
      const terms = row.tags.map((t) => kqlLiteral(t)).join(' OR ');
      clauses.push(`event.rule.tags: (${terms})`);
    }
  }

  return clauses.length > 0 ? clauses.join(' AND ') : undefined;
}

// ---------------------------------------------------------------------------
// Concurrency key — differs by trigger kind
// ---------------------------------------------------------------------------
function buildConcurrencyKey(
  kind: 'significant_event' | 'alert' | 'schedule',
  dedupeMode: string | undefined
): string {
  if (kind === 'alert') {
    // Dedup per alert instance: one run per (alert uuid, automation)
    return '{{ event.alert.uuid }}';
  }
  switch (dedupeMode ?? 'event_id') {
    case 'rule_id':
      return '{{ event.rule.id }}';
    case 'none':
      return '{{ execution.id }}';
    case 'event_id':
    default:
      return '{{ event.event_id }}';
  }
}

// ---------------------------------------------------------------------------
// Determine the primary trigger kind from the rows
// ---------------------------------------------------------------------------
function primaryKind(rows: NightshiftTriggerRow[]): 'significant_event' | 'alert' | 'schedule' | null {
  for (const row of rows) {
    if (row.kind === 'significant_event') return 'significant_event';
    if (row.kind === 'alert') return 'alert';
  }
  const first = rows[0];
  return first ? first.kind : null;
}

/**
 * Generates a workflow YAML document from a nightshift automation config.
 *
 * Uses the yaml package to serialize all user-provided strings so that special
 * characters (newlines, colons, quotes) in prompt templates never corrupt the document.
 *
 * Trigger rows of the automation's primary kind are compiled to triggers with
 * KQL `on.condition` filters. Mixed-kind rows (e.g. one alert + one schedule)
 * are handled by picking the first non-schedule kind; schedule-only rows
 * produce a manual trigger (scheduled execution is a planned future feature).
 */
export function generateWorkflowYaml(
  automationId: string,
  automation: NightshiftAutomationAttributes
): string {
  const kind = primaryKind(automation.trigger.rows);
  const dailyLimit = automation.runtime.dailyDispatchLimit ?? 20;

  let triggers: unknown[];
  let concurrencyKey: string;
  let triggerInvestigationWith: Record<string, unknown>;

  if (kind === 'alert') {
    const alertRows = automation.trigger.rows.filter(
      (r): r is Extract<NightshiftTriggerRow, { kind: 'alert' }> => r.kind === 'alert'
    );

    triggers = alertRows.map((row) => {
      const condition = buildAlertCondition(row);
      if (condition) {
        return { type: 'alerting.alertStateChanged', on: { condition } };
      }
      return { type: 'alerting.alertStateChanged' };
    });

    if (triggers.length === 0) {
      triggers = [{ type: 'manual' }];
    }

    concurrencyKey = '{{ event.alert.uuid }}';
    triggerInvestigationWith = {
      subject_type: 'alert',
      subject_id: '{{ event.alert.uuid }}',
      summary: '{{ event.rule.name }}: alert {{ event.alert.id }}',
      trigger_type: 'automatic',
      concurrency_key: '{{ event.alert.uuid }}',
      context: {
        alerts: [
          {
            id: '{{ event.alert.uuid }}',
            rule_id: '{{ event.rule.id }}',
            rule_name: '{{ event.rule.name }}',
            rule_type_id: '{{ event.rule.ruleTypeId }}',
            rule_category: '{{ event.rule.ruleCategory }}',
            status: '{{ event.alert.status }}',
            start: '{{ event.alert.start }}',
          },
        ],
      },
      ...(automation.execution.promptTemplate
        ? { message: automation.execution.promptTemplate }
        : {}),
    };
  } else if (kind === 'significant_event') {
    const sigEventRows = automation.trigger.rows.filter(
      (r): r is Extract<NightshiftTriggerRow, { kind: 'significant_event' }> =>
        r.kind === 'significant_event'
    );

    triggers = sigEventRows.map((row) => {
      const condition = buildSigEventCondition(row);
      if (condition) {
        return { type: 'significant-events.eventCreated', on: { condition } };
      }
      return { type: 'significant-events.eventCreated' };
    });

    if (triggers.length === 0) {
      triggers = [{ type: 'manual' }];
    }

    concurrencyKey = buildConcurrencyKey('significant_event', automation.runtime.dedupeMode);
    triggerInvestigationWith = {
      subject_type: 'significant_event',
      subject_id: '{{ event.event_id }}',
      summary: '{{ event.title }}',
      trigger_type: 'automatic',
      concurrency_key: '{{ event.event_id }}',
      ...(automation.execution.promptTemplate
        ? { message: automation.execution.promptTemplate }
        : {}),
    };
  } else {
    // schedule-only or no rows: non-firing placeholder
    triggers = [{ type: 'manual' }];
    concurrencyKey = '{{ execution.id }}';
    triggerInvestigationWith = {
      subject_type: 'unknown',
      subject_id: '{{ execution.id }}',
      summary: automation.name,
      trigger_type: 'automatic',
      concurrency_key: '{{ execution.id }}',
    };
  }

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
        with: triggerInvestigationWith,
      },
    ],
  };

  return stringify(workflowObj, { lineWidth: 0 });
}
