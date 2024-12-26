/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/public/mocks';
import { getMutedAlerts } from './get_rules_muted_alerts';

const http = httpServiceMock.createStartContract();

describe('getMutedAlerts', () => {
  const apiRes = {
    page: 1,
    per_page: 10,
    total: 0,
    data: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    http.post.mockResolvedValueOnce(apiRes);
  });

  test('should call find API with correct params', async () => {
    const result = await getMutedAlerts(http, { ruleIds: ['foo'] });

    expect(result).toEqual({
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"rule_type_ids\\":[\\"foo\\"],\\"fields\\":[\\"id\\",\\"mutedInstanceIds\\"],\\"page\\":1,\\"per_page\\":1}",
          "signal": undefined,
        },
      ]
    `);
  });
});
