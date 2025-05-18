/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectAnalyzeWildcard } from './inject_analyze_wildcard';

const getQuery = (query?: string) => {
  return {
    bool: {
      must: [],
      filter: [
        {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      query_string: {
                        fields: ['kibana.alert.instance.id'],
                        query: query || '*elastic*',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    {
                      match: {
                        'kibana.alert.action_group': 'test',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      ],
      should: [],
      must_not: [
        {
          match_phrase: {
            _id: 'assdasdasd',
          },
        },
      ],
    },
  };
};
describe('injectAnalyzeWildcard', () => {
  test('should inject analyze_wildcard field', () => {
    const query = getQuery();
    injectAnalyzeWildcard(query);
    expect(query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "query_string": Object {
                            "analyze_wildcard": true,
                            "fields": Array [
                              "kibana.alert.instance.id",
                            ],
                            "query": "*elastic*",
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "kibana.alert.action_group": "test",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          "must": Array [],
          "must_not": Array [
            Object {
              "match_phrase": Object {
                "_id": "assdasdasd",
              },
            },
          ],
          "should": Array [],
        },
      }
    `);
  });

  test('should not inject analyze_wildcard if the query does not contain *', () => {
    const query = getQuery('test');
    injectAnalyzeWildcard(query);
    expect(query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "query_string": Object {
                            "fields": Array [
                              "kibana.alert.instance.id",
                            ],
                            "query": "test",
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "kibana.alert.action_group": "test",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          "must": Array [],
          "must_not": Array [
            Object {
              "match_phrase": Object {
                "_id": "assdasdasd",
              },
            },
          ],
          "should": Array [],
        },
      }
    `);
  });
});
