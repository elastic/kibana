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
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\"))",
  },
  {
    condition: { field: 'log.logger', neq: 'nginx_proxy' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() != \"nginx_proxy\") || relevant_fields['log.logger'] != \"nginx_proxy\"))",
  },
  {
    condition: { field: 'http.response.status_code', lt: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) < 500) || relevant_fields['http.response.status_code'] < 500))",
  },
  {
    condition: { field: 'http.response.status_code', lte: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) <= 500) || relevant_fields['http.response.status_code'] <= 500))",
  },
  {
    condition: { field: 'http.response.status_code', gt: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) > 500) || relevant_fields['http.response.status_code'] > 500))",
  },
  {
    condition: { field: 'http.response.status_code', gte: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) >= 500) || relevant_fields['http.response.status_code'] >= 500))",
  },
  {
    condition: { field: 'log.logger', startsWith: 'nginx' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString().startsWith(\"nginx\")) || relevant_fields['log.logger'].startsWith(\"nginx\")))",
  },
  {
    condition: { field: 'log.logger', endsWith: 'proxy' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString().endsWith(\"proxy\")) || relevant_fields['log.logger'].endsWith(\"proxy\")))",
  },
  {
    condition: { field: 'log.logger', contains: 'proxy' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString().toLowerCase().contains(\"proxy\")) || relevant_fields['log.logger'].toLowerCase().contains(\"proxy\")))",
  },
  {
    condition: { field: 'log.logger', exists: true },
    result: "relevant_fields['log.logger'] !== null",
  },
  {
    condition: { field: 'log.logger', exists: false },
    result: "relevant_fields['log.logger'] == null",
  },

  {
    condition: {
      field: 'http.response.status_code',
      range: { gte: 200, lt: 300 },
    },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof Number && relevant_fields['http.response.status_code'] >= 200 && relevant_fields['http.response.status_code'] < 300) || (relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) >= 200 && Float.parseFloat(relevant_fields['http.response.status_code']) < 300)))",
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
          "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) > 500) || relevant_fields['http.response.status_code'] > 500))"
        );
      });
      test('ensure string comparison works with number values', () => {
        const condition = {
          field: 'message',
          contains: 500,
        };
        expect(conditionToStatement(condition)).toEqual(
          "(relevant_fields['message'] !== null && ((relevant_fields['message'] instanceof Number && relevant_fields['message'].toString().toLowerCase().contains(\"500\")) || relevant_fields['message'].toLowerCase().contains(\"500\")))"
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
          "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) && (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\"))"
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
          "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\"))"
        );
      });
    });

    describe('not', () => {
      test('not with a simple filter', () => {
        const condition = {
          not: { field: 'log.level', eq: 'error' },
        };
        expect(conditionToStatement(condition)).toEqual(
          "!((relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\")))"
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
          "!(((relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"warn\") || relevant_fields['log.level'] == \"warn\"))))"
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
          "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) && ((relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"ERROR\") || relevant_fields['log.level'] == \"ERROR\")))"
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
          "((relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) || (relevant_fields['service.name'] !== null && ((relevant_fields['service.name'] instanceof Number && relevant_fields['service.name'].toString() == \"nginx\") || relevant_fields['service.name'] == \"nginx\"))) && ((relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"ERROR\") || relevant_fields['log.level'] == \"ERROR\")))"
        );
      });
    });
  });

  test('wrapped with type checks for unary conditions', () => {
    const condition = { field: 'log', exists: true };
    expect(conditionToPainless(condition)).toMatchInlineSnapshot(`
      "
        def relevant_fields = [:];
        
      relevant_fields['log'] = ctx['log'];

        
        try {
        if (relevant_fields['log'] !== null) {
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
        def relevant_fields = [:];
        
      relevant_fields['log.logger.name'] = ctx['log'];
      if (relevant_fields['log.logger.name'] != null) {
        if (relevant_fields['log.logger.name'] instanceof Map) {
          relevant_fields['log.logger.name'] = relevant_fields['log.logger.name']['logger'];
        } else {
          relevant_fields['log.logger.name'] = null;
        }
      }
      if (relevant_fields['log.logger.name'] != null) {
        if (relevant_fields['log.logger.name'] instanceof Map) {
          relevant_fields['log.logger.name'] = relevant_fields['log.logger.name']['name'];
        } else {
          relevant_fields['log.logger.name'] = null;
        }
      }

      relevant_fields['log.level'] = ctx['log'];
      if (relevant_fields['log.level'] != null) {
        if (relevant_fields['log.level'] instanceof Map) {
          relevant_fields['log.level'] = relevant_fields['log.level']['level'];
        } else {
          relevant_fields['log.level'] = null;
        }
      }

        
        try {
        if ((relevant_fields['log.logger.name'] !== null && ((relevant_fields['log.logger.name'] instanceof Number && relevant_fields['log.logger.name'].toString() == \\"nginx_proxy\\") || relevant_fields['log.logger.name'] == \\"nginx_proxy\\")) && ((relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \\"error\\") || relevant_fields['log.level'] == \\"error\\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \\"ERROR\\") || relevant_fields['log.level'] == \\"ERROR\\")))) {
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
