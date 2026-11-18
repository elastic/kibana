/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { resolveAlertRules } from './resolve_alert_rules';

const alertDoc = (uuid: string, name: string) => ({
  found: true,
  _source: { kibana: { alert: { rule: { uuid, name } } } },
});

describe('resolveAlertRules', () => {
  const logger = loggingSystemMock.createLogger();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('replaces a missing or signature rule id with the alert rule uuid', async () => {
    esClient.mget.mockResolvedValue({
      docs: [alertDoc('so-uuid-1', 'Rule one'), alertDoc('so-uuid-2', 'Rule two')],
    } as never);

    const result = await resolveAlertRules({
      alerts: [
        { alertId: 'a1', index: '.alerts', rule: { name: 'Rule one' } },
        { alertId: 'a2', index: '.alerts', rule: { id: 'signature-id', name: 'model name' } },
      ],
      esClient,
      logger,
    });

    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [
        {
          _id: 'a1',
          _index: '.alerts',
          _source: ['kibana.alert.rule.uuid', 'kibana.alert.rule.name'],
        },
        {
          _id: 'a2',
          _index: '.alerts',
          _source: ['kibana.alert.rule.uuid', 'kibana.alert.rule.name'],
        },
      ],
    });
    expect(result).toEqual([
      { alertId: 'a1', index: '.alerts', rule: { id: 'so-uuid-1', name: 'Rule one' } },
      { alertId: 'a2', index: '.alerts', rule: { id: 'so-uuid-2', name: 'Rule two' } },
    ]);
  });

  it('keeps the given rule for alerts whose document is not found', async () => {
    esClient.mget.mockResolvedValue({
      docs: [{ found: false }, alertDoc('so-uuid-2', 'Rule two')],
    } as never);

    const result = await resolveAlertRules({
      alerts: [
        { alertId: 'a1', index: '.alerts', rule: { id: 'given', name: 'Given' } },
        { alertId: 'a2', index: '.alerts' },
      ],
      esClient,
      logger,
    });

    expect(result).toEqual([
      { alertId: 'a1', index: '.alerts', rule: { id: 'given', name: 'Given' } },
      { alertId: 'a2', index: '.alerts', rule: { id: 'so-uuid-2', name: 'Rule two' } },
    ]);
  });

  it('keeps the given rule fields the document does not carry', async () => {
    esClient.mget.mockResolvedValue({
      docs: [{ found: true, _source: {} }],
    } as never);

    const result = await resolveAlertRules({
      alerts: [{ alertId: 'a1', index: '.alerts', rule: { name: 'Given' } }],
      esClient,
      logger,
    });

    expect(result).toEqual([{ alertId: 'a1', index: '.alerts', rule: { name: 'Given' } }]);
  });

  it('does not read anything when there are no alerts', async () => {
    await expect(resolveAlertRules({ alerts: [], esClient, logger })).resolves.toEqual([]);
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('returns the alerts unchanged when they cannot be read', async () => {
    esClient.mget.mockRejectedValue(new Error('forbidden'));
    const alerts = [{ alertId: 'a1', index: '.alerts', rule: { name: 'Given' } }];

    await expect(resolveAlertRules({ alerts, esClient, logger })).resolves.toBe(alerts);
  });
});
