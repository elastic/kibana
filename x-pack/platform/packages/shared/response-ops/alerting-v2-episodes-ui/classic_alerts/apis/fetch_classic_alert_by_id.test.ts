/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchClassicAlertById } from './fetch_classic_alert_by_id';

const mockHttp = httpServiceMock.createStartContract();

const TEST_RULE_TYPE_IDS = ['observability.rules.custom_threshold', '.es-query'];

describe('fetchClassicAlertById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the full source with _index and _id', async () => {
    mockHttp.post.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'doc-id',
            _index: '.alerts-observability.metrics',
            _source: { 'kibana.alert.uuid': 'target-uuid', 'kibana.alert.status': 'active' },
          },
        ],
      },
    });

    const result = await fetchClassicAlertById({
      id: 'target-uuid',
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });

    expect(result['kibana.alert.uuid']).toBe('target-uuid');
    expect(result._index).toBe('.alerts-observability.metrics');
    expect(result._id).toBe('doc-id');
  });

  it('throws when the alert is not found', async () => {
    mockHttp.post.mockResolvedValue({ hits: { hits: [] } });

    await expect(
      fetchClassicAlertById({
        id: 'missing',
        ruleTypeIds: TEST_RULE_TYPE_IDS,
        services: { http: mockHttp },
      })
    ).rejects.toThrow('Classic alert not found: missing');
  });
});
