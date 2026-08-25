/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSnapshot } from '../../common';
import { buildInvestigationMessage, getAlertSnapshots } from './build_investigation_message';

const alert = (overrides: Partial<AlertSnapshot> = {}): AlertSnapshot => ({
  id: 'alert-uuid-1',
  rule_id: 'rule-uuid-1',
  rule_name: 'Latency is too high',
  rule_type_id: 'apm.transaction_duration',
  rule_category: 'Latency threshold',
  reason: 'Latency is 2.5s in the last 5 minutes for service checkout',
  status: 'active',
  start: '2026-08-24T12:00:00.000Z',
  flapping: false,
  ...overrides,
});

describe('getAlertSnapshots', () => {
  it('returns the alerts when the context holds a well-formed array', () => {
    expect(getAlertSnapshots({ alerts: [alert()] })).toEqual([alert()]);
  });

  it.each([
    ['a non-object context', 'nope'],
    ['a context with no alerts key', { source: 'alert' }],
    ['an empty alerts array', { alerts: [] }],
    ['alerts that are not objects', { alerts: ['alert-uuid-1'] }],
    ['alerts missing required fields', { alerts: [{ id: 'alert-uuid-1' }] }],
  ])('returns undefined for %s', (_label, context) => {
    expect(getAlertSnapshots(context)).toBeUndefined();
  });

  it('rejects the whole array when only one entry is malformed', () => {
    expect(getAlertSnapshots({ alerts: [alert(), { id: 'partial' }] })).toBeUndefined();
  });
});

describe('buildInvestigationMessage', () => {
  const alertSubject = { type: 'alert' as const, id: 'alert-uuid-1' };
  const eventSubject = { type: 'significant_event' as const, id: 'event-uuid-1' };

  it('states the rule, status and reason for a single alert', () => {
    const message = buildInvestigationMessage(alertSubject, { alerts: [alert()] });

    expect(message).toContain('An alert fired.');
    expect(message).toContain(
      'Rule "Latency is too high" (Latency threshold, type apm.transaction_duration)'
    );
    expect(message).toContain('is active, first active at 2026-08-24T12:00:00.000Z');
    expect(message).toContain('Reason: Latency is 2.5s in the last 5 minutes for service checkout');
  });

  it('flattens nested grouping to dotted field paths', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [alert({ grouping: { service: { name: 'checkout' }, host: { name: 'web-1' } } })],
    });

    expect(message).toContain('Affected entity: service.name: checkout, host.name: web-1');
  });

  it('falls back to the flat group form when grouping is absent', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [alert({ group: [{ field: 'service.name', value: 'checkout' }] })],
    });

    expect(message).toContain('Affected entity: service.name: checkout');
  });

  it('renders a string evaluation value, as .es-query writes it', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [alert({ evaluation: { value: '2500', threshold: 1000 } })],
    });

    expect(message).toContain('Condition: observed 2500 against threshold 1000');
  });

  it('renders a numeric evaluation value, as the experimental field map maps it', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [alert({ evaluation: { value: 2500, threshold: 1000 } })],
    });

    expect(message).toContain('Condition: observed 2500 against threshold 1000');
  });

  it('omits optional sections that the rule type did not populate', () => {
    const message = buildInvestigationMessage(alertSubject, { alerts: [alert()] });

    expect(message).not.toContain('Affected entity');
    expect(message).not.toContain('Condition');
    expect(message).not.toContain('index pattern');
    expect(message).not.toContain('Rule tags');
    expect(message).not.toContain('flapping');
    expect(message).not.toContain('Rule query');
  });

  it('states the rule query when the caller supplied one', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [
        alert({
          queries: [{ index: 'metrics-apm*', request: { size: 0, query: { match_all: {} } } }],
        }),
      ],
    });

    expect(message).toContain(
      'Rule query against metrics-apm*: {"size":0,"query":{"match_all":{}}}'
    );
    expect(message).not.toContain('That query returned');
  });

  it('includes the query response when the inspector executed it', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [
        alert({
          queries: [
            { index: 'metrics-apm*', request: { size: 0 }, response: { hits: { total: 5 } } },
          ],
        }),
      ],
    });

    expect(message).toContain('That query returned: {"hits":{"total":5}}');
  });

  it('labels each query when a rule ran more than one', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [
        alert({
          queries: [
            { index: 'metrics-apm*', request: { size: 0 }, label: 'current window' },
            { index: 'metrics-apm*', request: { size: 1 }, label: 'baseline window' },
          ],
        }),
      ],
    });

    expect(message).toContain('Rule query "current window" against metrics-apm*');
    expect(message).toContain('Rule query "baseline window" against metrics-apm*');
  });

  it('calls out flapping only when the alert is flapping', () => {
    expect(
      buildInvestigationMessage(alertSubject, { alerts: [alert({ flapping: true })] })
    ).toContain('This alert is flapping');
  });

  it('numbers the alerts when several are investigated together', () => {
    const message = buildInvestigationMessage(alertSubject, {
      alerts: [alert(), alert({ id: 'alert-uuid-2', rule_name: 'Error rate is too high' })],
    });

    expect(message).toContain('2 related alerts fired.');
    expect(message).toContain('Alert 1:');
    expect(message).toContain('Alert 2:');
    expect(message).toContain('Error rate is too high');
  });

  it('falls back to the generic message for significant events', () => {
    expect(buildInvestigationMessage(eventSubject, { some: 'context' })).toBe(
      'Investigation requested for significant_event event-uuid-1'
    );
  });

  it('falls back to the generic message when an alert subject carries no snapshots', () => {
    expect(buildInvestigationMessage(alertSubject, undefined)).toBe(
      'Investigation requested for alert alert-uuid-1'
    );
  });

  it('does not treat alerts on a significant_event subject as alert context', () => {
    expect(buildInvestigationMessage(eventSubject, { alerts: [alert()] })).toBe(
      'Investigation requested for significant_event event-uuid-1'
    );
  });
});
