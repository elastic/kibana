/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleTags } from './get_rule_tags';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const http = httpServiceMock.createStartContract();

describe('getRuleTags', () => {
  it('should call the getTags API', async () => {
    const resolvedValue = {
      data: ['a', 'b', 'c'],
      total: 3,
      page: 2,
      per_page: 30,
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await getRuleTags({
      http,
      search: 'test',
      page: 2,
      perPage: 30,
      ruleTypeIds: ['test-rule-type'],
    });

    expect(result).toEqual({
      data: ['a', 'b', 'c'],
      page: 2,
      perPage: 30,
      total: 3,
    });

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_tags",
        Object {
          "query": Object {
            "page": 2,
            "per_page": 30,
            "rule_type_ids": Array [
              "test-rule-type",
            ],
            "search": "test",
          },
        },
      ]
    `);
  });
});
