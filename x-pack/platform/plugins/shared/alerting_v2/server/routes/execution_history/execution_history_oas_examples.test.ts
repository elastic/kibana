/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_EXECUTIONS_MAX_RESULT_WINDOW } from '@kbn/alerting-v2-schemas';
import {
  GET_RULE_EXECUTIONS_SUMMARY,
  getRuleExecutionsOasExamples,
} from './execution_history_oas_examples';
import { GetRuleExecutionsRoute } from './get_rule_executions_route';

describe('execution history OAS examples', () => {
  it('includes success and 400 examples for list rule executions', () => {
    const oas = getRuleExecutionsOasExamples();

    expect(
      oas.responses?.[200]?.content?.['application/json']?.examples?.getRuleExecutionsResponse
    ).toEqual(
      expect.objectContaining({
        summary: GET_RULE_EXECUTIONS_SUMMARY,
        value: expect.objectContaining({
          total: 1,
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 'execution-1',
              outcome: 'success',
            }),
          ]),
        }),
      })
    );
    expect(GetRuleExecutionsRoute.options.summary).toBe(GET_RULE_EXECUTIONS_SUMMARY);
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRuleExecutionsQuery
    ).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: `page * perPage cannot exceed ${RULE_EXECUTIONS_MAX_RESULT_WINDOW}.`,
        }),
      })
    );
  });

  it('is exposed on GetRuleExecutionsRoute.options', async () => {
    expect(GetRuleExecutionsRoute.options.oasOperationObject).toBe(getRuleExecutionsOasExamples);

    const oas = await GetRuleExecutionsRoute.options.oasOperationObject!();
    expect(typeof oas).not.toBe('string');
    if (typeof oas === 'string') {
      throw new Error('expected object OAS fragment');
    }

    expect(
      oas.responses?.[200]?.content?.['application/json']?.examples?.getRuleExecutionsResponse
    ).toBeDefined();
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRuleExecutionsQuery
    ).toBeDefined();
  });
});
