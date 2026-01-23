/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToQueryDsl } from './condition_to_query_dsl';

describe('conditionToQueryDsl', () => {
  describe('filter conditions', () => {
    it('converts eq operator', () => {
      const result = conditionToQueryDsl({
        field: 'status',
        eq: 'active',
      });
      expect(result).toEqual({
        match: { status: 'active' },
      });
    });

    it('converts neq operator', () => {
      const result = conditionToQueryDsl({
        field: 'status',
        neq: 'inactive',
      });
      expect(result).toEqual({
        bool: { must_not: { match: { status: 'inactive' } } },
      });
    });

    it('converts exists operator (true)', () => {
      const result = conditionToQueryDsl({
        field: 'user.email',
        exists: true,
      });
      expect(result).toEqual({
        exists: { field: 'user.email' },
      });
    });

    it('converts exists operator (false)', () => {
      const result = conditionToQueryDsl({
        field: 'user.email',
        exists: false,
      });
      expect(result).toEqual({
        bool: { must_not: { exists: { field: 'user.email' } } },
      });
    });

    it('converts gt operator', () => {
      const result = conditionToQueryDsl({
        field: 'age',
        gt: 18,
      });
      expect(result).toEqual({
        range: { age: { gt: 18 } },
      });
    });

    it('converts gte operator', () => {
      const result = conditionToQueryDsl({
        field: 'age',
        gte: 18,
      });
      expect(result).toEqual({
        range: { age: { gte: 18 } },
      });
    });

    it('converts lt operator', () => {
      const result = conditionToQueryDsl({
        field: 'age',
        lt: 65,
      });
      expect(result).toEqual({
        range: { age: { lt: 65 } },
      });
    });

    it('converts lte operator', () => {
      const result = conditionToQueryDsl({
        field: 'age',
        lte: 65,
      });
      expect(result).toEqual({
        range: { age: { lte: 65 } },
      });
    });

    it('converts range operator with gte and lt', () => {
      const result = conditionToQueryDsl({
        field: 'http.response.status_code',
        range: { gte: 200, lt: 300 },
      });
      expect(result).toEqual({
        range: { 'http.response.status_code': { gte: 200, lt: 300 } },
      });
    });

    it('converts range operator with gt and lte', () => {
      const result = conditionToQueryDsl({
        field: 'temperature',
        range: { gt: 0, lte: 100 },
      });
      expect(result).toEqual({
        range: { temperature: { gt: 0, lte: 100 } },
      });
    });

    it('converts range operator with all boundaries', () => {
      const result = conditionToQueryDsl({
        field: 'value',
        range: { gte: 10, gt: 5, lte: 100, lt: 110 },
      });
      expect(result).toEqual({
        range: { value: { gte: 10, gt: 5, lte: 100, lt: 110 } },
      });
    });

    it('converts range operator with date strings', () => {
      const result = conditionToQueryDsl({
        field: '@timestamp',
        range: { gte: '2024-01-01', lt: '2024-12-31' },
      });
      expect(result).toEqual({
        range: { '@timestamp': { gte: '2024-01-01', lt: '2024-12-31' } },
      });
    });

    it('converts contains operator', () => {
      const result = conditionToQueryDsl({
        field: 'message',
        contains: 'error',
      });
      expect(result).toEqual({
        wildcard: {
          message: {
            value: '*error*',
            case_insensitive: true,
          },
        },
      });
    });

    it('converts startsWith operator', () => {
      const result = conditionToQueryDsl({
        field: 'url',
        startsWith: 'https://',
      });
      expect(result).toEqual({
        prefix: { url: 'https://*' },
      });
    });

    it('converts endsWith operator', () => {
      const result = conditionToQueryDsl({
        field: 'filename',
        endsWith: '.log',
      });
      expect(result).toEqual({
        wildcard: { filename: '*.log' },
      });
    });
  });

  describe('logical operators', () => {
    it('converts and condition', () => {
      const result = conditionToQueryDsl({
        and: [
          { field: 'status', eq: 'active' },
          { field: 'age', gte: 18 },
        ],
      });
      expect(result).toEqual({
        bool: {
          must: [{ match: { status: 'active' } }, { range: { age: { gte: 18 } } }],
        },
      });
    });

    it('converts or condition', () => {
      const result = conditionToQueryDsl({
        or: [
          { field: 'status', eq: 'active' },
          { field: 'status', eq: 'pending' },
        ],
      });
      expect(result).toEqual({
        bool: {
          should: [{ match: { status: 'active' } }, { match: { status: 'pending' } }],
        },
      });
    });

    it('converts not condition', () => {
      const result = conditionToQueryDsl({
        not: { field: 'status', eq: 'deleted' },
      });
      expect(result).toEqual({
        bool: {
          must_not: { match: { status: 'deleted' } },
        },
      });
    });

    it('converts nested logical conditions', () => {
      const result = conditionToQueryDsl({
        and: [
          { field: 'status', eq: 'active' },
          {
            or: [
              { field: 'priority', eq: 'high' },
              { field: 'priority', eq: 'critical' },
            ],
          },
        ],
      });
      expect(result).toEqual({
        bool: {
          must: [
            { match: { status: 'active' } },
            {
              bool: {
                should: [{ match: { priority: 'high' } }, { match: { priority: 'critical' } }],
              },
            },
          ],
        },
      });
    });
  });

  describe('special conditions', () => {
    it('converts always condition', () => {
      const result = conditionToQueryDsl({ always: {} });
      expect(result).toEqual({ match_all: {} });
    });

    it('converts never condition', () => {
      const result = conditionToQueryDsl({ never: {} });
      expect(result).toEqual({ match_none: {} });
    });
  });
});
