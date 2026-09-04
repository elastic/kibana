/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startInvestigationRoute } from './start_investigation';

const { handler } = startInvestigationRoute['POST /internal/nightshift/investigations'];

const alert = {
  'kibana.alert.uuid': 'alert-1',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Test rule',
  'kibana.alert.rule.rule_type_id': 'test.rule',
  'kibana.alert.rule.category': 'Test category',
  'kibana.alert.reason': 'Threshold exceeded',
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-09-02T10:00:00.000Z',
};

const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
const getInvestigationsClient = jest.fn().mockReturnValue({ start });
const getAlertsClient = jest.fn().mockResolvedValue({
  getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(['.alerts-observability.test']),
  get: jest.fn().mockResolvedValue(alert),
});

beforeEach(() => jest.clearAllMocks());

it('loads the alert and builds the investigation context when none is given', async () => {
  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      getAlertsClient,
      params: { body: { subject: { type: 'alert', id: 'alert-1' } } },
    } as never)
  ).resolves.toEqual({ investigation_id: 'investigation-1' });
  expect(start).toHaveBeenCalledWith({
    subject: { type: 'alert', id: 'alert-1' },
    concurrency_key: 'alert-1',
    context: { alerts: [expect.objectContaining({ id: 'alert-1', rule_id: 'rule-1' })] },
    trigger_type: 'manual',
  });
});

it('passes a caller-provided context through unchanged', async () => {
  const context = { alerts: [{ id: 'alert-1' }] };
  await handler({
    request: {},
    getInvestigationsClient,
    getAlertsClient,
    params: {
      body: { subject: { type: 'alert', id: 'alert-1' }, concurrency_key: 'key-1', context },
    },
  } as never);
  expect(getAlertsClient).not.toHaveBeenCalled();
  expect(start).toHaveBeenCalledWith({
    subject: { type: 'alert', id: 'alert-1' },
    concurrency_key: 'key-1',
    context,
    trigger_type: 'manual',
  });
});

it('returns service unavailable when alert lookup is not wired', async () => {
  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      getAlertsClient: () => undefined,
      params: { body: { subject: { type: 'alert', id: 'alert-1' } } },
    } as never)
  ).rejects.toMatchObject({ output: { statusCode: 503 } });
});
