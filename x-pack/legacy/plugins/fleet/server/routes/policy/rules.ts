/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeList, ReturnTypeCreate, ReturnTypeDelete } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { RuntimeEnrollmentRuleData } from '../../repositories/tokens/types';

export const createPostEnrollmentRulesRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/policy/{policyId}/enrollment-rules',
  config: {},
  handler: async (
    request: FrameworkRequest<{ params: { policyId: string } }>
  ): Promise<ReturnTypeCreate<any>> => {
    const { policyId } = request.params;

    const result = RuntimeEnrollmentRuleData.decode(request.payload);
    if (isLeft(result)) {
      throw Boom.badRequest(
        `Malformed request, action is invalid, (${PathReporter.report(result)})`
      );
    }
    const rule = await libs.tokens.addEnrollmentRuleForPolicy(request.user, policyId, result.right);

    return { item: rule, success: true, action: 'created' };
  },
});

export const createGetEnrollmentRulesRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/policy/{policyId}/enrollment-rules',
  config: {},
  handler: async (
    request: FrameworkRequest<{ params: { policyId: string } }>
  ): Promise<ReturnTypeList<any>> => {
    const { policyId } = request.params;
    const token = await libs.tokens.getEnrollmentTokenForPolicy(request.user, policyId);

    if (!token) {
      throw Boom.notFound(`token not found for policy ${policyId}`);
    }

    return {
      list: token.enrollment_rules,
      page: 1,
      total: token.enrollment_rules.length,
      success: true,
    };
  },
});

export const createDeleteEnrollmentRuleRoute = (libs: FleetServerLib) => ({
  method: 'DELETE',
  path: '/api/policy/{policyId}/enrollment-rules/{ruleId}',
  config: {},
  handler: async (
    request: FrameworkRequest<{ params: { policyId: string; ruleId: string } }>
  ): Promise<ReturnTypeDelete> => {
    const { policyId, ruleId } = request.params;
    await libs.tokens.deleteEnrollmentRuleForPolicy(request.user, policyId, ruleId);

    return {
      success: true,
      action: 'deleted',
    };
  },
});
