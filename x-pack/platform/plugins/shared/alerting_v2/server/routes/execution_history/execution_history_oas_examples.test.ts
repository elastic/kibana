/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_EXECUTIONS_MAX_PER_PAGE,
  RULE_EXECUTIONS_MAX_RESULT_WINDOW,
  getRuleExecutionsPagePerPageExceedsMaxMessage,
  getRuleExecutionsQuerySchema,
} from '@kbn/alerting-v2-schemas';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import type { AlertingV2OasOperationObject } from '../json_oas_example';
import { INVALID_QUERY_PARAMETERS_DESCRIPTION } from '../route_response_descriptions';
import {
  GET_RULE_EXECUTIONS_SUMMARY,
  getRuleExecutionsOasExamples,
} from './execution_history_oas_examples';
import { GetRuleExecutionsRoute } from './get_rule_executions_route';

const getValidateResponseDescription = (status: number): string | undefined => {
  const { validate } = GetRuleExecutionsRoute;
  if (typeof validate !== 'object' || validate === null || !('response' in validate)) {
    return undefined;
  }
  const response = (validate as { response?: Record<number, { description?: string }> }).response;
  return response?.[status]?.description;
};

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
        summary: INVALID_QUERY_PARAMETERS_DESCRIPTION,
        value: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: expect.stringContaining(getRuleExecutionsPagePerPageExceedsMaxMessage()),
        }),
      })
    );

    const invalidQueryParse = getRuleExecutionsQuerySchema.safeParse({
      page: RULE_EXECUTIONS_MAX_RESULT_WINDOW / RULE_EXECUTIONS_MAX_PER_PAGE + 1,
      perPage: RULE_EXECUTIONS_MAX_PER_PAGE,
    });
    expect(invalidQueryParse.success).toBe(false);
    if (invalidQueryParse.success) {
      throw new Error('expected invalid query parse to fail');
    }
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRuleExecutionsQuery
        ?.value.message
    ).toBe(stringifyZodError(invalidQueryParse.error));
    expect(getValidateResponseDescription(400)).toBe(INVALID_QUERY_PARAMETERS_DESCRIPTION);
  });

  it('is exposed on GetRuleExecutionsRoute.options', async () => {
    expect(GetRuleExecutionsRoute.options.oasOperationObject).toBe(getRuleExecutionsOasExamples);

    const oasOperationObject = GetRuleExecutionsRoute.options.oasOperationObject;
    expect(oasOperationObject).toBeDefined();
    if (!oasOperationObject) {
      throw new Error('expected oasOperationObject');
    }

    const oas = (await oasOperationObject()) as AlertingV2OasOperationObject;
    expect(typeof oas).not.toBe('string');

    expect(
      oas.responses?.[200]?.content?.['application/json']?.examples?.getRuleExecutionsResponse
    ).toBeDefined();
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRuleExecutionsQuery
    ).toBeDefined();
  });
});
