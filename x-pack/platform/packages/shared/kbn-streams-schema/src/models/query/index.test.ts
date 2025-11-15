/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryStream } from '.';
import { emptyAssets } from '../../helpers/empty_assets';

describe('QueryStream', () => {
  describe('Definition', () => {
    it.each([
      {
        name: 'query-stream',
        description: '',
        query: {
          esql: 'FROM logs.query-child | WHERE service.name == "query-child"',
        },
      },
    ])('is valid', (val) => {
      expect(QueryStream.Definition.is(val)).toBe(true);
      expect(QueryStream.Definition.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        name: 'query-stream',
        description: null,
        query: {
          esql: 'FROM logs.query-child | WHERE service.name == "query-child"',
        },
      },
      {
        name: 'query-stream',
        description: '',
        query: {},
      },
      {
        name: 'query-stream',
        description: '',
        query: {
          esql: null,
        },
      },
    ])('is not valid', (val) => {
      expect(() => QueryStream.Definition.asserts(val as any)).toThrow();
    });
  });

  describe('GetResponse', () => {
    it.each([
      {
        stream: {
          name: 'query-stream',
          description: '',
          query: {
            esql: 'FROM logs.query-child | WHERE service.name == "query-child"',
          },
        },
        inherited_fields: {},
        sub_query_streams: [],
        ...emptyAssets,
      },
    ])('is valid', (val) => {
      expect(QueryStream.GetResponse.is(val)).toBe(true);
      expect(QueryStream.GetResponse.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        stream: {
          description: '',
          query: {
            esql: 'FROM logs.query-child | WHERE service.name == "query-child"',
          },
        },
        dashboards: [],
        queries: [],
      },
      {
        stream: {
          description: '',
          query: {
            esql: 'FROM logs.query-child | WHERE service.name == "query-child"',
          },
        },
        dashboards: [],
      },
      {
        stream: {
          description: '',
          query: {},
        },
        queries: [],
      },
    ])('is not valid', (val) => {
      expect(QueryStream.GetResponse.is(val as any)).toBe(false);
    });
  });

  describe('UpsertRequest', () => {
    it.each([
      {
        stream: {
          description: '',
          query: {
            esql: 'FROM logs.query-child | WHERE service.name == "query-child"',
          },
        },
        ...emptyAssets,
      },
    ])('is valid', (val) => {
      expect(QueryStream.UpsertRequest.is(val)).toBe(true);
      expect(QueryStream.UpsertRequest.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        dashboards: [],
        queries: [],
        stream: {
          query: {
            esql: [],
          },
        },
      },
      {
        dashboards: [],
        queries: [],
        stream: {
          description: '',
        },
      },
      {
        dashboards: [],
        queries: [],
        stream: {
          name: 'my-name',
          description: '',
          query: {
            esql: 'FROM logs.query-child | WHERE service.name == "query-child"',
          },
        },
      },
    ])('is not valid', (val) => {
      expect(QueryStream.UpsertRequest.is(val as any)).toBe(false);
    });
  });
});
