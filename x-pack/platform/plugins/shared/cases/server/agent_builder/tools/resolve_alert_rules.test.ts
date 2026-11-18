/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { resolveAlertRules } from './resolve_alert_rules';

const hit = (id: string, uuid: string, name: string, index = '.internal.alerts-000001') => ({
  _id: id,
  _index: index,
  _source: { kibana: { alert: { rule: { uuid, name } } } },
});

const searchResponse = (hits: unknown[]) => ({ hits: { hits } } as never);

describe('resolveAlertRules', () => {
  const logger = loggingSystemMock.createLogger();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('replaces a missing or signature rule id with the alert rule uuid', async () => {
    esClient.search.mockResolvedValue(
      searchResponse([hit('a1', 'so-uuid-1', 'Rule one'), hit('a2', 'so-uuid-2', 'Rule two')])
    );

    const result = await resolveAlertRules({
      alerts: [
        { alertId: 'a1', index: '.alerts', rule: { name: 'Rule one' } },
        { alertId: 'a2', index: '.alerts', rule: { id: 'signature-id', name: 'model name' } },
      ],
      esClient,
      logger,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith({
      index: '.alerts',
      size: 4,
      query: { ids: { values: ['a1', 'a2'] } },
      _source: ['kibana.alert.rule.uuid', 'kibana.alert.rule.name'],
      track_total_hits: false,
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    expect(result).toEqual([
      { alertId: 'a1', index: '.alerts', rule: { id: 'so-uuid-1', name: 'Rule one' } },
      { alertId: 'a2', index: '.alerts', rule: { id: 'so-uuid-2', name: 'Rule two' } },
    ]);
  });

  it('searches each index once and matches alerts by index and id', async () => {
    esClient.search.mockImplementation((async ({ index }: { index: string }) =>
      index === '.alerts-a'
        ? searchResponse([hit('same-id', 'uuid-a', 'Rule A')])
        : searchResponse([hit('same-id', 'uuid-b', 'Rule B')])) as never);

    const result = await resolveAlertRules({
      alerts: [
        { alertId: 'same-id', index: '.alerts-a' },
        { alertId: 'same-id', index: '.alerts-b' },
      ],
      esClient,
      logger,
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { alertId: 'same-id', index: '.alerts-a', rule: { id: 'uuid-a', name: 'Rule A' } },
      { alertId: 'same-id', index: '.alerts-b', rule: { id: 'uuid-b', name: 'Rule B' } },
    ]);
  });

  it('keeps the given rule when the id matches alerts in several backing indices', async () => {
    esClient.search.mockResolvedValue(
      searchResponse([
        hit('a1', 'uuid-1', 'Rule one', '.internal.alerts-000001'),
        hit('a1', 'uuid-2', 'Rule two', '.internal.alerts-000002'),
      ])
    );
    const alerts = [{ alertId: 'a1', index: '.alerts', rule: { id: 'given', name: 'Given' } }];

    await expect(resolveAlertRules({ alerts, esClient, logger })).resolves.toEqual(alerts);
  });

  it('keeps the given rule for alerts that are not found', async () => {
    esClient.search.mockResolvedValue(searchResponse([hit('a2', 'so-uuid-2', 'Rule two')]));

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
    esClient.search.mockResolvedValue(
      searchResponse([{ _id: 'a1', _index: '.internal.alerts-000001', _source: {} }])
    );

    const result = await resolveAlertRules({
      alerts: [{ alertId: 'a1', index: '.alerts', rule: { name: 'Given' } }],
      esClient,
      logger,
    });

    expect(result).toEqual([{ alertId: 'a1', index: '.alerts', rule: { name: 'Given' } }]);
  });

  it('does not read remote indices or empty references', async () => {
    const alerts = [
      { alertId: 'a1', index: 'remote:.alerts', rule: { name: 'Remote' } },
      { alertId: '', index: '.alerts' },
      { alertId: 'a3', index: '' },
    ];

    await expect(resolveAlertRules({ alerts, esClient, logger })).resolves.toEqual(alerts);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('does not read anything when there are no alerts', async () => {
    await expect(resolveAlertRules({ alerts: [], esClient, logger })).resolves.toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('keeps the given rules for an index that cannot be read', async () => {
    esClient.search.mockImplementation((async ({ index }: { index: string }) => {
      if (index === '.alerts-forbidden') {
        throw new Error('forbidden');
      }
      return searchResponse([hit('a2', 'uuid-2', 'Rule two')]);
    }) as never);

    const result = await resolveAlertRules({
      alerts: [
        { alertId: 'a1', index: '.alerts-forbidden', rule: { name: 'Given' } },
        { alertId: 'a2', index: '.alerts' },
      ],
      esClient,
      logger,
    });

    expect(result).toEqual([
      { alertId: 'a1', index: '.alerts-forbidden', rule: { name: 'Given' } },
      { alertId: 'a2', index: '.alerts', rule: { id: 'uuid-2', name: 'Rule two' } },
    ]);
  });
});
