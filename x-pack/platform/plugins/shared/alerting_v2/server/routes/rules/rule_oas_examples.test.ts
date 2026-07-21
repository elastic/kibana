/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getInvalidRuleDataMessage,
  getRuleNotFoundMessage,
  getRuleVersionConflictMessage,
} from '../../lib/errors/rule_error_messages';
import { CreateRuleRoute } from './create_rule_route';
import {
  createRuleOasExamples,
  getRuleOasExamples,
  ruleTagsOasExamples,
  upsertRuleOasExamples,
} from './rule_oas_examples';

describe('rule OAS examples', () => {
  it('includes request, success, and route-error examples for create', () => {
    const oas = createRuleOasExamples();

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createRuleRequest
    ).toBeDefined();
    expect(
      oas.responses?.[201]?.content?.['application/json']?.examples?.createRuleResponse
    ).toBeDefined();
    expect(oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRuleData).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
          message: getInvalidRuleDataMessage('create', 'metadata.name: Required'),
        }),
      })
    );
  });

  it('includes 404 examples for get', () => {
    const oas = getRuleOasExamples();

    expect(oas.responses?.[404]?.content?.['application/json']?.examples?.ruleNotFound).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND,
          message: getRuleNotFoundMessage('rule-1'),
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
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.RULE_VERSION_CONFLICT,
          message: getRuleVersionConflictMessage('rule-1'),
        }),
      })
    );
  });

  it('is exposed on CreateRuleRoute.options', async () => {
    expect(CreateRuleRoute.options.oasOperationObject).toBe(createRuleOasExamples);

    const oas = await CreateRuleRoute.options.oasOperationObject!();
    expect(typeof oas).not.toBe('string');
    if (typeof oas === 'string') {
      throw new Error('expected object OAS fragment');
    }

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createRuleRequest
    ).toBeDefined();
    expect(
      oas.responses?.[201]?.content?.['application/json']?.examples?.createRuleResponse
    ).toBeDefined();
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidRuleData
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
