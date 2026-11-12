/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { nodeBuilder } from '@kbn/es-query';
import { loadRuleHealth } from './health';

const http = httpServiceMock.createStartContract();

describe('loadRuleHealth', () => {
  beforeEach(() => jest.resetAllMocks());

  it('calls the _health endpoint and rewrites the response to camelCase', async () => {
    http.post.mockResolvedValueOnce({
      total: 3,
      by_outcome: { succeeded: 1, failed: 2, warning: 0 },
      by_status: { ok: 1, error: 2, active: 0, pending: 0, unknown: 0, warning: 0 },
      by_error_reason: [{ reason: 'execute', count: 2 }],
      by_warning_reason: [],
      top_error_messages: [{ reason: 'execute', message: 'boom', count: 2 }],
      api_key_error: { count: 2, messages: ['security_exception: [0x28D520]'] },
      missing_api_key: { count: 1 },
    });

    const filter = nodeBuilder.is('alert.attributes.tags', 'foo');
    const result = await loadRuleHealth({
      http,
      ruleTypeIds: ['a'],
      consumers: ['b'],
      filter,
    });

    const [path, { body }] = http.post.mock.calls[0] as unknown as [string, { body: string }];
    expect(path).toBe('/internal/alerting/rules/_health');
    expect(JSON.parse(body)).toEqual({
      filter: JSON.stringify(filter),
      rule_type_ids: ['a'],
      consumers: ['b'],
      default_search_operator: 'AND',
    });
    expect(result).toEqual({
      total: 3,
      byOutcome: { succeeded: 1, failed: 2, warning: 0 },
      byStatus: { ok: 1, error: 2, active: 0, pending: 0, unknown: 0, warning: 0 },
      byErrorReason: [{ reason: 'execute', count: 2 }],
      byWarningReason: [],
      topErrorMessages: [{ reason: 'execute', message: 'boom', count: 2 }],
      apiKeyError: { count: 2, messages: ['security_exception: [0x28D520]'] },
      missingApiKey: { count: 1 },
    });
  });
});
