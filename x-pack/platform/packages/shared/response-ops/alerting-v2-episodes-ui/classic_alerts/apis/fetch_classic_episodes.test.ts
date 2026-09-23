/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchClassicAlertsAsEpisodes } from './fetch_classic_episodes';
import { CLASSIC_ALERT_EPISODE_SOURCE_FIELDS } from '../utils/map_alert';

const mockHttp = httpServiceMock.createStartContract();

const TEST_RULE_TYPE_IDS = ['observability.rules.custom_threshold', '.es-query'];

const makeHit = (source: Record<string, unknown>) => ({
  _id: 'hit-1',
  _index: '.alerts-observability.test',
  _source: source,
});

describe('fetchClassicAlertsAsEpisodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the RAC find endpoint and maps hits to episodes', async () => {
    mockHttp.post.mockResolvedValue({
      hits: {
        hits: [
          makeHit({
            'kibana.alert.uuid': 'uuid-1',
            'kibana.alert.status': 'active',
            'kibana.alert.rule.uuid': 'rule-1',
            'kibana.alert.rule.name': 'Test Rule',
            '@timestamp': '2024-01-01T00:00:00.000Z',
          }),
        ],
      },
    });

    const episodes = await fetchClassicAlertsAsEpisodes({
      pageSize: 100,
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });

    const [, callOptions] = mockHttp.post.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(callOptions.body);
    expect(body.rule_type_ids).toEqual(TEST_RULE_TYPE_IDS);
    expect(body._source).toEqual([...CLASSIC_ALERT_EPISODE_SOURCE_FIELDS]);
    expect(episodes).toHaveLength(1);
    expect(episodes[0].supports_actions).toBe(false);
    expect(episodes[0].supports_timeline).toBe(false);
  });

  it('skips hits without _source', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [{ _id: 'no-source' }] },
    });

    const episodes = await fetchClassicAlertsAsEpisodes({
      pageSize: 100,
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });

    expect(episodes).toHaveLength(0);
  });
});
