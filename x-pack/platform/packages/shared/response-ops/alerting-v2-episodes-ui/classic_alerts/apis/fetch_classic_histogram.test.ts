/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchClassicAlertsHistogram } from './fetch_classic_histogram';
import { CLASSIC_ALERT_HISTOGRAM_SOURCE_FIELDS } from '../utils/map_alert';

const mockHttp = httpServiceMock.createStartContract();

const TEST_RULE_TYPE_IDS = ['observability.rules.custom_threshold', '.es-query'];

const makeHit = (source: Record<string, unknown>) => ({
  _id: 'hit-1',
  _index: '.alerts-observability.test',
  _source: source,
});

describe('fetchClassicAlertsHistogram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches alert documents and requests the histogram source projection', async () => {
    mockHttp.post.mockResolvedValue({
      hits: {
        hits: [
          makeHit({
            'kibana.alert.uuid': 'uuid-1',
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'kibana.alert.start': '2024-01-01T00:00:00.000Z',
            'kibana.alert.end': '2024-01-01T01:00:00.000Z',
            'kibana.alert.status': 'active',
          }),
        ],
      },
    });

    const rows = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });

    const [, callOptions] = mockHttp.post.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(callOptions.body);
    expect(body.rule_type_ids).toEqual(TEST_RULE_TYPE_IDS);
    expect(body._source).toEqual([...CLASSIC_ALERT_HISTOGRAM_SOURCE_FIELDS]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      first_timestamp: '2024-01-01T00:00:00.000Z',
      last_timestamp: '2024-01-01T01:00:00.000Z',
      'episode.status': 'active',
    });
  });

  it('passes breakdownField to the row mapper', async () => {
    mockHttp.post.mockResolvedValue({
      hits: {
        hits: [
          makeHit({
            'kibana.alert.uuid': 'uuid-1',
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'kibana.alert.rule.uuid': 'rule-abc',
            'kibana.alert.status': 'active',
          }),
        ],
      },
    });

    const rows = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      breakdownField: 'rule.id',
    });

    expect(rows[0]['rule.id']).toBe('rule-abc');
  });
});
