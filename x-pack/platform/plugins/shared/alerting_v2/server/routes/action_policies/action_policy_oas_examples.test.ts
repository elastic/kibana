/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getActionPolicyNotFoundMessage,
  getActionPolicyVersionConflictMessage,
  getInvalidActionPolicyDataMessage,
} from '../../lib/errors/action_policy_error_messages';
import { CreateActionPolicyRoute } from './create_action_policy_route';
import {
  createActionPolicyOasExamples,
  getActionPolicyOasExamples,
  upsertActionPolicyOasExamples,
} from './action_policy_oas_examples';

describe('action policy OAS examples', () => {
  it('includes request, success, and route-error examples for create', () => {
    const oas = createActionPolicyOasExamples();

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createActionPolicyRequest
    ).toBeDefined();
    expect(
      oas.responses?.[201]?.content?.['application/json']?.examples?.createActionPolicyResponse
    ).toBeDefined();
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidActionPolicyData
    ).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.INVALID_ACTION_POLICY_DATA,
        }),
      })
    );
  });

  it('includes 404 examples for get', () => {
    const oas = getActionPolicyOasExamples();

    expect(
      oas.responses?.[404]?.content?.['application/json']?.examples?.actionPolicyNotFound
    ).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND,
          message: getActionPolicyNotFoundMessage('action-policy-1'),
        }),
      })
    );
  });

  it('includes 409 examples for upsert', () => {
    const oas = upsertActionPolicyOasExamples();

    expect(
      oas.responses?.[409]?.content?.['application/json']?.examples?.actionPolicyVersionConflict
    ).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_VERSION_CONFLICT,
          message: getActionPolicyVersionConflictMessage('action-policy-1'),
        }),
      })
    );
  });

  it('is exposed on CreateActionPolicyRoute.options', async () => {
    expect(CreateActionPolicyRoute.options.oasOperationObject).toBe(createActionPolicyOasExamples);

    const oas = await CreateActionPolicyRoute.options.oasOperationObject!();
    expect(typeof oas).not.toBe('string');
    if (typeof oas === 'string') {
      throw new Error('expected object OAS fragment');
    }

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createActionPolicyRequest
    ).toBeDefined();
    expect(
      oas.responses?.[201]?.content?.['application/json']?.examples?.createActionPolicyResponse
    ).toBeDefined();
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidActionPolicyData
    ).toBeDefined();
  });
});
