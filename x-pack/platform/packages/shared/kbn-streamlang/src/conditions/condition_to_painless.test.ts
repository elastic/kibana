/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToPainless, conditionToStatement } from './condition_to_painless';

const operatorConditionAndResults = [
  {
    condition: { field: 'log.logger', eq: 'nginx_proxy' },
    result:
      "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString() == \"nginx_proxy\") || $('log.logger', null) == \"nginx_proxy\"))",
  },
  {
    condition: { field: 'log.logger', neq: 'nginx_proxy' },
    result:
      "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString() != \"nginx_proxy\") || $('log.logger', null) != \"nginx_proxy\"))",
  },
  {
    condition: { field: 'http.response.status_code', lt: 500 },
    result:
      "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) < 500) || $('http.response.status_code', null) < 500))",
  },
  {
    condition: { field: 'http.response.status_code', lte: 500 },
    result:
      "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) <= 500) || $('http.response.status_code', null) <= 500))",
  },
  {
    condition: { field: 'http.response.status_code', gt: 500 },
    result:
      "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) > 500) || $('http.response.status_code', null) > 500))",
  },
  {
    condition: { field: 'http.response.status_code', gte: 500 },
    result:
      "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) >= 500) || $('http.response.status_code', null) >= 500))",
  },
  {
    condition: { field: 'log.logger', startsWith: 'nginx' },
    result:
      "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString().startsWith(\"nginx\")) || $('log.logger', null).startsWith(\"nginx\")))",
  },
  {
    condition: { field: 'log.logger', endsWith: 'proxy' },
    result:
      "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString().endsWith(\"proxy\")) || $('log.logger', null).endsWith(\"proxy\")))",
  },
  {
    condition: { field: 'log.logger', contains: 'proxy' },
    result:
      "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString().toLowerCase().contains(\"proxy\")) || $('log.logger', null).toLowerCase().contains(\"proxy\")))",
  },
  {
    condition: { field: 'log.logger', exists: true },
    result: "$('log.logger', null) !== null",
  },
  {
    condition: { field: 'log.logger', exists: false },
    result: "$('log.logger', null) == null",
  },

  {
    condition: {
      field: 'http.response.status_code',
      range: { gte: 200, lt: 300 },
    },
    result:
      "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof Number && $('http.response.status_code', null) >= 200 && $('http.response.status_code', null) < 300) || ($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) >= 200 && Float.parseFloat($('http.response.status_code', null)) < 300)))",
  },
];

describe('conditionToPainless', () => {
  describe('conditionToStatement', () => {
    describe('operators', () => {
      operatorConditionAndResults.forEach((setup) => {
        test(JSON.stringify(setup.condition), () => {
          expect(conditionToStatement(setup.condition)).toEqual(setup.result);
        });
      });

      test('ensure number comparison works with string values', () => {
        const condition = {
          field: 'http.response.status_code',
          gt: '500',
        };
        expect(conditionToStatement(condition)).toEqual(
          "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) > 500) || $('http.response.status_code', null) > 500))"
        );
      });
      test('ensure string comparison works with number values', () => {
        const condition = {
          field: 'message',
          contains: 500,
        };
        expect(conditionToStatement(condition)).toEqual(
          "($('message', null) !== null && (($('message', null) instanceof Number && $('message', null).toString().toLowerCase().contains(\"500\")) || $('message', null).toLowerCase().contains(\"500\")))"
        );
      });

      test.skip('boolean eq operator should compare against boolean values directly', () => {
        const condition = {
          field: 'should_process',
          eq: true,
        };
        // This test expects the field to be compared against boolean literal `true`
        expect(conditionToStatement(condition)).toEqual(
          "($('should_process', null) !== null && $('should_process', null) == true)"
        );
      });

      test.skip('boolean neq operator should compare against boolean values directly', () => {
        const condition = {
          field: 'is_active',
          neq: false,
        };

        // This test expects the field to be compared against boolean literal `false`
        expect(conditionToStatement(condition)).toEqual(
          "($('is_active', null) !== null && $('is_active', null) != false)"
        );
      });

      test.skip('boolean eq with false should work correctly', () => {
        const condition = {
          field: 'is_disabled',
          eq: false,
        };

        // This test expects the field to be compared against boolean literal `false`
        expect(conditionToStatement(condition)).toEqual(
          "($('is_disabled', null) !== null && $('is_disabled', null) == false)"
        );
      });

      test.skip('boolean neq with true should work correctly', () => {
        const condition = {
          field: 'should_skip',
          neq: true,
        };

        // This test expects the field to be compared against boolean literal `true`
        expect(conditionToStatement(condition)).toEqual(
          "($('should_skip', null) !== null && $('should_skip', null) != true)"
        );
      });
    });

    describe('and', () => {
      test('simple', () => {
        const condition = {
          and: [
            { field: 'log.logger', eq: 'nginx_proxy' },
            { field: 'log.level', eq: 'error' },
          ],
        };
        expect(conditionToStatement(condition)).toEqual(
          "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString() == \"nginx_proxy\") || $('log.logger', null) == \"nginx_proxy\")) && ($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"error\") || $('log.level', null) == \"error\"))"
        );
      });
    });

    describe('or', () => {
      test('simple', () => {
        const condition = {
          or: [
            { field: 'log.logger', eq: 'nginx_proxy' },
            { field: 'log.level', eq: 'error' },
          ],
        };
        expect(conditionToStatement(condition)).toEqual(
          "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString() == \"nginx_proxy\") || $('log.logger', null) == \"nginx_proxy\")) || ($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"error\") || $('log.level', null) == \"error\"))"
        );
      });
    });

    describe('not', () => {
      test('not with a simple filter', () => {
        const condition = {
          not: { field: 'log.level', eq: 'error' },
        };
        expect(conditionToStatement(condition)).toEqual(
          "!(($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"error\") || $('log.level', null) == \"error\")))"
        );
      });

      test('not with a nested or', () => {
        const condition = {
          not: {
            or: [
              { field: 'log.level', eq: 'error' },
              { field: 'log.level', eq: 'warn' },
            ],
          },
        };
        expect(conditionToStatement(condition)).toEqual(
          "!((($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"error\") || $('log.level', null) == \"error\")) || ($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"warn\") || $('log.level', null) == \"warn\"))))"
        );
      });
    });

    describe('nested', () => {
      test('and with a filter and or with 2 filters', () => {
        const condition = {
          and: [
            { field: 'log.logger', eq: 'nginx_proxy' },
            {
              or: [
                { field: 'log.level', eq: 'error' },
                { field: 'log.level', eq: 'ERROR' },
              ],
            },
          ],
        };
        expect(conditionToStatement(condition)).toEqual(
          "($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString() == \"nginx_proxy\") || $('log.logger', null) == \"nginx_proxy\")) && (($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"error\") || $('log.level', null) == \"error\")) || ($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"ERROR\") || $('log.level', null) == \"ERROR\")))"
        );
      });
      test('and with 2 or with filters', () => {
        const condition = {
          and: [
            {
              or: [
                { field: 'log.logger', eq: 'nginx_proxy' },
                { field: 'service.name', eq: 'nginx' },
              ],
            },
            {
              or: [
                { field: 'log.level', eq: 'error' },
                { field: 'log.level', eq: 'ERROR' },
              ],
            },
          ],
        };
        expect(conditionToStatement(condition)).toEqual(
          "(($('log.logger', null) !== null && (($('log.logger', null) instanceof Number && $('log.logger', null).toString() == \"nginx_proxy\") || $('log.logger', null) == \"nginx_proxy\")) || ($('service.name', null) !== null && (($('service.name', null) instanceof Number && $('service.name', null).toString() == \"nginx\") || $('service.name', null) == \"nginx\"))) && (($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"error\") || $('log.level', null) == \"error\")) || ($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \"ERROR\") || $('log.level', null) == \"ERROR\")))"
        );
      });
    });
  });

  test('wrapped with type checks for unary conditions', () => {
    const condition = { field: 'log', exists: true };
    expect(conditionToPainless(condition)).toMatchInlineSnapshot(`
      "
        try {
        if ($('log', null) !== null) {
          return true;
        }
        return false;
      } catch (Exception e) {
        return false;
      }
      "
    `);
  });

  test('wrapped with typechecks and try/catch', () => {
    const condition = {
      and: [
        { field: 'log.logger.name', eq: 'nginx_proxy' },
        {
          or: [
            { field: 'log.level', eq: 'error' },
            { field: 'log.level', eq: 'ERROR' },
          ],
        },
      ],
    };
    expect(conditionToPainless(condition)).toMatchInlineSnapshot(`
      "
        try {
        if (($('log.logger.name', null) !== null && (($('log.logger.name', null) instanceof Number && $('log.logger.name', null).toString() == \\"nginx_proxy\\") || $('log.logger.name', null) == \\"nginx_proxy\\")) && (($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \\"error\\") || $('log.level', null) == \\"error\\")) || ($('log.level', null) !== null && (($('log.level', null) instanceof Number && $('log.level', null).toString() == \\"ERROR\\") || $('log.level', null) == \\"ERROR\\")))) {
          return true;
        }
        return false;
      } catch (Exception e) {
        return false;
      }
      "
    `);
  });
});
