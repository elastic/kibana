/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchClassicAlertsTags } from './fetch_classic_tags';

const mockHttp = httpServiceMock.createStartContract();

const TEST_RULE_TYPE_IDS = ['observability.rules.custom_threshold', '.es-query'];

describe('fetchClassicAlertsTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts tag keys from the terms aggregation', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        tags: {
          buckets: [
            { key: 'production', doc_count: 10 },
            { key: 'staging', doc_count: 5 },
          ],
        },
      },
    });

    const tags = await fetchClassicAlertsTags({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });

    expect(tags).toEqual(['production', 'staging']);
  });

  it('returns empty array when no buckets', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: { tags: { buckets: [] } },
    });

    const tags = await fetchClassicAlertsTags({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });
    expect(tags).toEqual([]);
  });
});
