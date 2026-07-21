/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleDataSchema } from '@kbn/alerting-v2-schemas';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getRuleNotFoundMessage,
  getRuleVersionConflictMessage,
} from '../../lib/errors/rule_error_messages';
import type { AlertingV2OasOperationObject } from '../json_oas_example';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import {
  INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  RULE_NOT_FOUND_DESCRIPTION,
  RULE_UPSERT_CONFLICT_DESCRIPTION,
  RULES_NOT_FOUND_DESCRIPTION,
} from '../route_response_descriptions';
import { CreateRuleRoute } from './create_rule_route';
import {
  CREATE_RULE_SUMMARY,
  bulkGetRulesOasExamples,
  createRuleOasExamples,
  getRuleOasExamples,
  ruleTagsOasExamples,
  upsertRuleOasExamples,
} from './rule_oas_examples';

const getValidateResponseDescription = (status: number): string | undefined => {
  const { validate } = CreateRuleRoute;
  if (typeof validate !== 'object' || validate === null || !('response' in validate)) {
    return undefined;
  }
  const response = (validate as { response?: Record<number, { description?: string }> }).response;
  return response?.[status]?.description;
};

describe('rule OAS examples', () => {
  it('includes request, success, and core request-validation 400 for create', () => {
    const oas = createRuleOasExamples();
    const invalidCreateParse = createRuleDataSchema.safeParse({});
    expect(invalidCreateParse.success).toBe(false);
    if (invalidCreateParse.success) {
      throw new Error('expected invalid create parse to fail');
    }

    expect(CreateRuleRoute.options.summary).toBe(CREATE_RULE_SUMMARY);
    expect(oas.requestBody?.content?.['application/json']?.examples?.createRuleRequest).toEqual(
      expect.objectContaining({ summary: CREATE_RULE_SUMMARY })
    );
    expect(
      oas.responses?.[201]?.content?.['application/json']?.examples?.createRuleResponse
    ).toEqual(expect.objectContaining({ summary: CREATE_RULE_SUMMARY }));
    expect(oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRequest).toEqual(
      expect.objectContaining({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        value: {
          statusCode: 400,
          error: 'Bad Request',
          message: stringifyZodError(invalidCreateParse.error),
        },
      })
    );
    expect(getValidateResponseDescription(400)).toBe(INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION);
  });

  it('includes 404 examples for get', () => {
    const oas = getRuleOasExamples();

    expect(oas.responses?.[404]?.content?.['application/json']?.examples?.ruleNotFound).toEqual(
      expect.objectContaining({
        summary: RULE_NOT_FOUND_DESCRIPTION,
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND,
          message: getRuleNotFoundMessage('rule-1'),
        }),
      })
    );
  });

  it('includes a generic NOT_FOUND 404 example for bulk get (raw SO Boom)', () => {
    const oas = bulkGetRulesOasExamples();

    expect(oas.responses?.[404]?.content?.['application/json']?.examples?.rulesNotFound).toEqual(
      expect.objectContaining({
        summary: RULES_NOT_FOUND_DESCRIPTION,
        value: expect.objectContaining({
          code: 'NOT_FOUND',
          message: `Saved object [${RULE_SAVED_OBJECT_TYPE}/rule-1] not found`,
        }),
      })
    );
  });

  it('includes 409 examples for upsert', () => {
    const oas = upsertRuleOasExamples();

    expect(
      oas.responses?.[409]?.content?.['application/json']?.examples?.ruleVersionConflict
    ).toEqual(
      expect.objectContaining({
        summary: RULE_UPSERT_CONFLICT_DESCRIPTION,
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.RULE_VERSION_CONFLICT,
          message: getRuleVersionConflictMessage('rule-1'),
        }),
      })
    );
  });

  it('is exposed on CreateRuleRoute.options', async () => {
    expect(CreateRuleRoute.options.oasOperationObject).toBe(createRuleOasExamples);

    const oasOperationObject = CreateRuleRoute.options.oasOperationObject;
    expect(oasOperationObject).toBeDefined();
    if (!oasOperationObject) {
      throw new Error('expected oasOperationObject');
    }

    const oas = (await oasOperationObject()) as AlertingV2OasOperationObject;
    expect(typeof oas).not.toBe('string');

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createRuleRequest
    ).toBeDefined();
    expect(
      oas.responses?.[201]?.content?.['application/json']?.examples?.createRuleResponse
    ).toBeDefined();
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRequest
    ).toBeDefined();
  });

  it('includes success examples for rule tags', () => {
    const oas = ruleTagsOasExamples();

    expect(oas.responses?.[200]?.content?.['application/json']?.examples?.ruleTagsResponse).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          tags: expect.arrayContaining(['production']),
        }),
      })
    );
  });
});
