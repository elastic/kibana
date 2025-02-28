/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToPainless, conditionToStatement } from './condition_to_painless';

const operatorConditionAndResults = [
  {
    condition: { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\"))",
  },
  {
    condition: { field: 'log.logger', operator: 'neq' as const, value: 'nginx_proxy' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() != \"nginx_proxy\") || relevant_fields['log.logger'] != \"nginx_proxy\"))",
  },
  {
    condition: { field: 'http.response.status_code', operator: 'lt' as const, value: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) < 500) || relevant_fields['http.response.status_code'] < 500))",
  },
  {
    condition: { field: 'http.response.status_code', operator: 'lte' as const, value: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) <= 500) || relevant_fields['http.response.status_code'] <= 500))",
  },
  {
    condition: { field: 'http.response.status_code', operator: 'gt' as const, value: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) > 500) || relevant_fields['http.response.status_code'] > 500))",
  },
  {
    condition: { field: 'http.response.status_code', operator: 'gte' as const, value: 500 },
    result:
      "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) >= 500) || relevant_fields['http.response.status_code'] >= 500))",
  },
  {
    condition: { field: 'log.logger', operator: 'startsWith' as const, value: 'nginx' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString().startsWith(\"nginx\")) || relevant_fields['log.logger'].startsWith(\"nginx\")))",
  },
  {
    condition: { field: 'log.logger', operator: 'endsWith' as const, value: 'proxy' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString().endsWith(\"proxy\")) || relevant_fields['log.logger'].endsWith(\"proxy\")))",
  },
  {
    condition: { field: 'log.logger', operator: 'contains' as const, value: 'proxy' },
    result:
      "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString().contains(\"proxy\")) || relevant_fields['log.logger'].contains(\"proxy\")))",
  },
  {
    condition: { field: 'log.logger', operator: 'exists' as const },
    result: "relevant_fields['log.logger'] !== null",
  },
  {
    condition: { field: 'log.logger', operator: 'notExists' as const },
    result: "relevant_fields['log.logger'] == null",
  },
];

describe('conditionToPainless', () => {
  describe('conditionToStatement', () => {
    describe('operators', () => {
      operatorConditionAndResults.forEach((setup) => {
        test(`${setup.condition.operator}`, () => {
          expect(conditionToStatement(setup.condition)).toEqual(setup.result);
        });
      });

      test('ensure number comparasion works with string values', () => {
        const condition = {
          field: 'http.response.status_code',
          operator: 'gt' as const,
          value: '500',
        };
        expect(conditionToStatement(condition)).toEqual(
          "(relevant_fields['http.response.status_code'] !== null && ((relevant_fields['http.response.status_code'] instanceof String && Float.parseFloat(relevant_fields['http.response.status_code']) > 500) || relevant_fields['http.response.status_code'] > 500))"
        );
      });
      test('ensure string comparasion works with number values', () => {
        const condition = {
          field: 'message',
          operator: 'contains' as const,
          value: 500,
        };
        expect(conditionToStatement(condition)).toEqual(
          "(relevant_fields['message'] !== null && ((relevant_fields['message'] instanceof Number && relevant_fields['message'].toString().contains(\"500\")) || relevant_fields['message'].contains(\"500\")))"
        );
      });
    });

    describe('and', () => {
      test('simple', () => {
        const condition = {
          and: [
            { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
            { field: 'log.level', operator: 'eq' as const, value: 'error' },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) && (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\"))"
          )
        );
      });
    });

    describe('or', () => {
      test('simple', () => {
        const condition = {
          or: [
            { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
            { field: 'log.level', operator: 'eq' as const, value: 'error' },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\"))"
          )
        );
      });
    });

    describe('nested', () => {
      test('and with a filter and or with 2 filters', () => {
        const condition = {
          and: [
            { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
            {
              or: [
                { field: 'log.level', operator: 'eq' as const, value: 'error' },
                { field: 'log.level', operator: 'eq' as const, value: 'ERROR' },
              ],
            },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            "(relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) && ((relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"ERROR\") || relevant_fields['log.level'] == \"ERROR\")))"
          )
        );
      });
      test('and with 2 or with filters', () => {
        const condition = {
          and: [
            {
              or: [
                { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
                { field: 'service.name', operator: 'eq' as const, value: 'nginx' },
              ],
            },
            {
              or: [
                { field: 'log.level', operator: 'eq' as const, value: 'error' },
                { field: 'log.level', operator: 'eq' as const, value: 'ERROR' },
              ],
            },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            "((relevant_fields['log.logger'] !== null && ((relevant_fields['log.logger'] instanceof Number && relevant_fields['log.logger'].toString() == \"nginx_proxy\") || relevant_fields['log.logger'] == \"nginx_proxy\")) || (relevant_fields['service.name'] !== null && ((relevant_fields['service.name'] instanceof Number && relevant_fields['service.name'].toString() == \"nginx\") || relevant_fields['service.name'] == \"nginx\"))) && ((relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"error\") || relevant_fields['log.level'] == \"error\")) || (relevant_fields['log.level'] !== null && ((relevant_fields['log.level'] instanceof Number && relevant_fields['log.level'].toString() == \"ERROR\") || relevant_fields['log.level'] == \"ERROR\")))"
          )
        );
      });
    });
  });

  test('wrapped with type checks for uinary conditions', () => {
    const condition = { field: 'log', operator: 'exists' as const };
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
        { field: 'log.logger.name', operator: 'eq' as const, value: 'nginx_proxy' },
        {
          or: [
            { field: 'log.level', operator: 'eq' as const, value: 'error' },
            { field: 'log.level', operator: 'eq' as const, value: 'ERROR' },
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
