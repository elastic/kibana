/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSnapshot, InvestigationSubject } from '../../common';

/**
 * The investigation workflow prompts the agent with `{{ inputs.message }}`, so this string is
 * the whole brief. A bare "Investigation requested for alert <uuid>" gives the agent an opaque
 * id and nothing to reason about; the alert already carries the rule condition and the affected
 * entity, so state them.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isAlertSnapshot(value: unknown): value is AlertSnapshot {
  return (
    isPlainObject(value) &&
    typeof value.id === 'string' &&
    typeof value.rule_name === 'string' &&
    typeof value.reason === 'string'
  );
}

export function getAlertSnapshots(context: unknown): AlertSnapshot[] | undefined {
  if (!isPlainObject(context)) return undefined;
  const { alerts } = context;
  if (!Array.isArray(alerts) || alerts.length === 0) return undefined;
  return alerts.every(isAlertSnapshot) ? alerts : undefined;
}

/**
 * `kibana.alert.grouping` is nested (`{ service: { name: 'checkout' } }`) while
 * `kibana.alert.group` is already flat. Flatten the former to dotted paths so both render the
 * same way, and so the field names match what the agent would write in an ES|QL query.
 */
function flattenGrouping(grouping: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(grouping).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) return flattenGrouping(value, path);
    if (value == null) return [];
    return [`${path}: ${String(value)}`];
  });
}

function describeEntity(alert: AlertSnapshot): string | undefined {
  if (alert.grouping) {
    const pairs = flattenGrouping(alert.grouping);
    if (pairs.length > 0) return pairs.join(', ');
  }
  if (alert.group && alert.group.length > 0) {
    return alert.group.map(({ field, value }) => `${field}: ${value}`).join(', ');
  }
  return undefined;
}

function describeCondition(alert: AlertSnapshot): string | undefined {
  const { value, threshold } = alert.evaluation ?? {};
  if (value != null && threshold != null) return `observed ${value} against threshold ${threshold}`;
  if (value != null) return `observed ${value}`;
  if (threshold != null) return `threshold ${threshold}`;
  return undefined;
}

function describeAlert(alert: AlertSnapshot): string {
  const lines = [
    `Rule "${alert.rule_name}" (${alert.rule_category}, type ${alert.rule_type_id}) is ${alert.status}, first active at ${alert.start}.`,
    `Reason: ${alert.reason}`,
  ];

  const entity = describeEntity(alert);
  if (entity) lines.push(`Affected entity: ${entity}`);

  const condition = describeCondition(alert);
  if (condition) lines.push(`Condition: ${condition}`);

  if (alert.index_pattern) {
    lines.push(`Start querying from index pattern: ${alert.index_pattern}`);
  }

  if (alert.rule_tags && alert.rule_tags.length > 0) {
    lines.push(`Rule tags: ${alert.rule_tags.join(', ')}`);
  }

  if (alert.flapping) {
    lines.push('This alert is flapping, so the condition is switching in and out repeatedly.');
  }

  if (alert.rule_parameters) {
    lines.push(`Rule parameters: ${JSON.stringify(alert.rule_parameters)}`);
  }

  // The query the rule actually ran is the strongest starting point there is, so state it last
  // where it reads as the handover into the agent's own querying.
  alert.queries?.forEach(({ index, request, response, label }) => {
    const name = label ? `Rule query "${label}"` : 'Rule query';
    lines.push(`${name} against ${index}: ${JSON.stringify(request)}`);
    if (response) {
      lines.push(`That query returned: ${JSON.stringify(response)}`);
    }
  });

  return lines.join('\n');
}

export function buildInvestigationMessage(subject: InvestigationSubject, context: unknown): string {
  const alerts = subject.type === 'alert' ? getAlertSnapshots(context) : undefined;

  if (!alerts) {
    return `Investigation requested for ${subject.type} ${subject.id}`;
  }

  if (alerts.length === 1) {
    return `An alert fired.\n\n${describeAlert(alerts[0])}`;
  }

  const blocks = alerts.map((alert, i) => `Alert ${i + 1}:\n${describeAlert(alert)}`);
  return `${alerts.length} related alerts fired.\n\n${blocks.join('\n\n')}`;
}
