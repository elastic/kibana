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
    condition: { field: 'tags', includes: 'error' },
    result:
      "($('tags', null) !== null && ($('tags', null) instanceof List ? ($('tags', null).contains(\"error\") || $('tags', null).stream().anyMatch(e -> String.valueOf(e).equals(\"error\"))) : ($('tags', null) == \"error\" || String.valueOf($('tags', null)).equals(\"error\"))))",
  },
  {
    condition: { field: 'status_codes', includes: 200 },
    result:
      "($('status_codes', null) !== null && ($('status_codes', null) instanceof List ? ($('status_codes', null).contains(200) || $('status_codes', null).stream().anyMatch(e -> String.valueOf(e).equals(\"200\"))) : ($('status_codes', null) == 200 || String.valueOf($('status_codes', null)).equals(\"200\"))))",
  },
  {
    condition: {
      field: 'http.response.status_code',
      range: { gte: 200, lt: 300 },
    },
    result:
      "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof Number && $('http.response.status_code', null) >= 200 && $('http.response.status_code', null) < 300) || ($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) >= 200 && Float.parseFloat($('http.response.status_code', null)) < 300)))",
  },
  // Range with ISO date strings (for parity with ES|QL which also handles as string comparison)
  {
    condition: {
      field: '@timestamp',
      range: { gte: '2024-01-01T00:00:00Z', lt: '2024-12-31T23:59:59Z' },
    },
    result:
      "($('@timestamp', null) !== null && (($('@timestamp', null) instanceof Number && String.valueOf($('@timestamp', null)).compareTo(\"2024-01-01T00:00:00Z\") >= 0 && String.valueOf($('@timestamp', null)).compareTo(\"2024-12-31T23:59:59Z\") < 0) || ($('@timestamp', null) instanceof String && $('@timestamp', null).compareTo(\"2024-01-01T00:00:00Z\") >= 0 && $('@timestamp', null).compareTo(\"2024-12-31T23:59:59Z\") < 0)))",
  },
  // Range with string numeric values (should be parsed as numbers)
  {
    condition: {
      field: 'http.response.status_code',
      range: { gte: '200', lt: '300' },
    },
    result:
      "($('http.response.status_code', null) !== null && (($('http.response.status_code', null) instanceof Number && $('http.response.status_code', null) >= 200 && $('http.response.status_code', null) < 300) || ($('http.response.status_code', null) instanceof String && Float.parseFloat($('http.response.status_code', null)) >= 200 && Float.parseFloat($('http.response.status_code', null)) < 300)))",
  },
];

describe('conditionToPainless', () => {
  describe('single-element array unwrapping', () => {
    test('should unwrap single-element arrays before comparison', () => {
      const condition = { field: 'foo', eq: 'bar' };
      const result = conditionToPainless(condition);

      // Should contain List instanceof check and size check
      expect(result).toContain('instanceof List');
      expect(result).toContain('.size() == 1');
    });

    test('should handle multiple fields with array unwrapping', () => {
      const condition = {
        and: [
          { field: 'foo', eq: 'bar' },
          { field: 'baz', eq: 'qux' },
        ],
      };
      const result = conditionToPainless(condition);

      // Should contain List checks for both fields
      expect(result).toContain('instanceof List');
      expect(result).toContain('.size() == 1');
    });
  });

  describe('conditionToStatement', () => {
    describe('operators', () => {
      operatorConditionAndResults.forEach((setup) => {
        test(JSON.stringify(setup.condition), () => {
          expect(conditionToStatement(setup.condition)).toEqual(setup.result);
        });
      });

      describe('range with date math expressions', () => {
        test('range with now-based date math (now-1d)', () => {
          const condition = {
            field: '@timestamp',
            range: { gte: 'now-1d', lt: 'now' },
          };
          const result = conditionToStatement(condition);
          // Should contain Painless date math evaluation code
          expect(result).toContain('System.currentTimeMillis()');
          expect(result).toContain('Instant.ofEpochMilli');
          expect(result).toContain('compareTo');
        });

        test('range with date math rounding (now/d)', () => {
          const condition = {
            field: '@timestamp',
            range: { gte: 'now-1d/d', lt: 'now/d' },
          };
          const result = conditionToStatement(condition);
          // Should contain time-based rounding code (not calendar units)
          expect(result).toContain('System.currentTimeMillis()');
        });

        test('range with anchored date math (date||+1d)', () => {
          const condition = {
            field: '@timestamp',
            range: { gte: '2024-01-01||+1d', lt: '2024-01-31||+1d' },
          };
          const result = conditionToStatement(condition);
          // Should contain Instant.parse for anchored dates
          expect(result).toContain('Instant.parse');
          expect(result).toContain('compareTo');
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

      test('boolean eq operator should compare against boolean values directly', () => {
        const condition = {
          field: 'should_process',
          eq: true,
        };
        // This test expects the field to be compared against boolean literal `true`
        expect(conditionToStatement(condition)).toEqual(
          "($('should_process', null) !== null && (($('should_process', null) instanceof Number && $('should_process', null).toString() == \"true\") || $('should_process', null) == true))"
        );
      });

      test('boolean neq operator should compare against boolean values directly', () => {
        const condition = {
          field: 'is_active',
          neq: false,
        };

        // This test expects the field to be compared against boolean literal `false`
        expect(conditionToStatement(condition)).toEqual(
          "($('is_active', null) !== null && (($('is_active', null) instanceof Number && $('is_active', null).toString() != \"false\") || $('is_active', null) != false))"
        );
      });

      test('boolean eq with false should work correctly', () => {
        const condition = {
          field: 'is_disabled',
          eq: false,
        };

        // This test expects the field to be compared against boolean literal `false`
        expect(conditionToStatement(condition)).toEqual(
          "($('is_disabled', null) !== null && (($('is_disabled', null) instanceof Number && $('is_disabled', null).toString() == \"false\") || $('is_disabled', null) == false))"
        );
      });

      test('boolean neq with true should work correctly', () => {
        const condition = {
          field: 'should_skip',
          neq: true,
        };

        // This test expects the field to be compared against boolean literal `true`
        expect(conditionToStatement(condition)).toEqual(
          "($('should_skip', null) !== null && (($('should_skip', null) instanceof Number && $('should_skip', null).toString() != \"true\") || $('should_skip', null) != true))"
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
        
        def val_log = $('log', null); if (val_log instanceof List && val_log.size() == 1) { val_log = val_log[0]; }
        
        
        if (val_log !== null) {
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
        
        def val_log_logger_name = $('log.logger.name', null); if (val_log_logger_name instanceof List && val_log_logger_name.size() == 1) { val_log_logger_name = val_log_logger_name[0]; }
        def val_log_level = $('log.level', null); if (val_log_level instanceof List && val_log_level.size() == 1) { val_log_level = val_log_level[0]; }
        
        
        if ((val_log_logger_name !== null && ((val_log_logger_name instanceof Number && val_log_logger_name.toString() == \\"nginx_proxy\\") || val_log_logger_name == \\"nginx_proxy\\")) && ((val_log_level !== null && ((val_log_level instanceof Number && val_log_level.toString() == \\"error\\") || val_log_level == \\"error\\")) || (val_log_level !== null && ((val_log_level instanceof Number && val_log_level.toString() == \\"ERROR\\") || val_log_level == \\"ERROR\\")))) {
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
