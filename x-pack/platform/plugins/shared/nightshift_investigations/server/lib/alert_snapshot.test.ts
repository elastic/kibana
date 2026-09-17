/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import {
  fetchAlertSnapshot,
  parseAlertSnapshot,
  snapshotFromAlertDocument,
} from './alert_snapshot';

const alert = {
  'kibana.alert.uuid': 'alert-1',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Test rule',
  'kibana.alert.rule.rule_type_id': 'test.rule',
  'kibana.alert.rule.category': 'Test category',
  'kibana.alert.reason': 'Threshold exceeded',
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-09-02T10:00:00.000Z',
  'kibana.alert.flapping': false,
  '@timestamp': '2026-09-02T10:01:00.000Z',
  'kibana.alert.group': [{ field: 'host.name', value: 'host-1' }],
};

describe('parseAlertSnapshot', () => {
  it('builds a validated alert snapshot', () => {
    expect(parseAlertSnapshot(alert)).toEqual({
      id: 'alert-1',
      rule_id: 'rule-1',
      rule_name: 'Test rule',
      rule_type_id: 'test.rule',
      rule_category: 'Test category',
      reason: 'Threshold exceeded',
      status: 'active',
      start: '2026-09-02T10:00:00.000Z',
      flapping: false,
      timestamp: '2026-09-02T10:01:00.000Z',
      group: [{ field: 'host.name', value: 'host-1' }],
    });
  });

  it('rejects missing required fields and omits malformed optional fields', () => {
    expect(parseAlertSnapshot({ ...alert, 'kibana.alert.uuid': undefined })).toBeUndefined();
    expect(
      parseAlertSnapshot({ ...alert, 'kibana.alert.group': [{ field: 'host.name', value: 42 }] })
    ).toEqual(expect.objectContaining({ id: 'alert-1' }));
  });

  it('normalizes valid legacy and metric alert fields', () => {
    expect(
      parseAlertSnapshot({
        ...alert,
        'kibana.alert.reason': undefined,
        'kibana.alert.flapping': undefined,
        'kibana.alert.evaluation.values': [42, null],
      })
    ).toEqual(
      expect.objectContaining({
        evaluation: { value: [42, null] },
      })
    );
  });
});

describe('snapshotFromAlertDocument', () => {
  const expectedSnapshot = {
    id: 'alert-1',
    rule_id: 'rule-1',
    rule_name: 'Test rule',
    rule_type_id: 'test.rule',
    rule_category: 'Test category',
    status: 'active',
    start: '2026-09-02T10:00:00.000Z',
  } as const;
  const expected = expect.objectContaining(expectedSnapshot);

  it('passes through an already-valid snapshot', () => {
    expect(
      snapshotFromAlertDocument({
        id: 'alert-1',
        rule_id: 'rule-1',
        rule_name: 'Test rule',
        rule_type_id: 'test.rule',
        rule_category: 'Test category',
        status: 'active',
        start: '2026-09-02T10:00:00.000Z',
      })
    ).toEqual(expected);
  });

  it('parses a flattened AAD document', () => {
    expect(snapshotFromAlertDocument(alert)).toEqual(expected);
  });

  it('parses a nested v1 rule-action alert document', () => {
    expect(
      snapshotFromAlertDocument({
        _id: 'alert-1',
        _index: '.alerts-observability.test',
        '@timestamp': '2026-09-02T10:01:00.000Z',
        kibana: {
          alert: {
            uuid: 'alert-1',
            status: 'active',
            reason: 'Threshold exceeded',
            start: '2026-09-02T10:00:00.000Z',
            flapping: false,
            group: [{ field: 'host.name', value: 'host-1' }],
            grouping: { service: { name: 'checkout' } },
            rule: {
              uuid: 'rule-1',
              name: 'Test rule',
              rule_type_id: 'test.rule',
              category: 'Test category',
              parameters: { threshold: 1000 },
            },
          },
        },
      })
    ).toEqual(
      expect.objectContaining({
        ...expectedSnapshot,
        grouping: { service: { name: 'checkout' } },
        rule_parameters: { threshold: 1000 },
      })
    );
  });

  it('keeps grouping and rule parameters on a flattened AAD document', () => {
    expect(
      snapshotFromAlertDocument({
        ...alert,
        'kibana.alert.grouping': { service: { name: 'checkout' } },
        'kibana.alert.rule.parameters': { threshold: 1000 },
      })
    ).toEqual(
      expect.objectContaining({
        ...expectedSnapshot,
        grouping: { service: { name: 'checkout' } },
        rule_parameters: { threshold: 1000 },
      })
    );
  });

  it('reads uuid from _id when the nested document omits kibana.alert.uuid', () => {
    expect(
      snapshotFromAlertDocument({
        _id: 'alert-1',
        kibana: {
          alert: {
            status: 'active',
            start: '2026-09-02T10:00:00.000Z',
            rule: {
              uuid: 'rule-1',
              name: 'Test rule',
              rule_type_id: 'test.rule',
              category: 'Test category',
            },
          },
        },
      })
    ).toEqual(expected);
  });

  it('unwraps a _source-wrapped hit', () => {
    expect(snapshotFromAlertDocument({ _id: 'alert-1', _source: alert })).toEqual(expected);
  });

  it('returns undefined for a document missing required fields', () => {
    expect(snapshotFromAlertDocument({ _id: 'alert-1', kibana: { alert: {} } })).toBeUndefined();
  });
});

describe('fetchAlertSnapshot', () => {
  const makeAlertsClient = (overrides: Partial<Record<string, jest.Mock>> = {}) =>
    ({
      getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(['.alerts-observability.test']),
      get: jest.fn().mockResolvedValue(alert),
      ...overrides,
    } as unknown as AlertsClient);

  it('loads the alert and returns its snapshot', async () => {
    await expect(fetchAlertSnapshot(makeAlertsClient(), 'alert-1')).resolves.toEqual(
      expect.objectContaining({ id: 'alert-1', rule_id: 'rule-1' })
    );
  });

  it('returns not found when the user has no authorized alert indices', async () => {
    const alertsClient = makeAlertsClient({
      getAuthorizedAlertsIndices: jest.fn().mockResolvedValue([]),
    });
    await expect(fetchAlertSnapshot(alertsClient, 'alert-1')).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
  });

  it('returns bad request when the alert lacks required fields', async () => {
    const alertsClient = makeAlertsClient({
      get: jest.fn().mockResolvedValue({ ...alert, 'kibana.alert.uuid': undefined }),
    });
    await expect(fetchAlertSnapshot(alertsClient, 'alert-1')).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
  });

  it('preserves alert lookup failures', async () => {
    const lookupError = new Error('Elasticsearch unavailable');
    const alertsClient = makeAlertsClient({ get: jest.fn().mockRejectedValue(lookupError) });
    await expect(fetchAlertSnapshot(alertsClient, 'alert-1')).rejects.toBe(lookupError);
  });
});
