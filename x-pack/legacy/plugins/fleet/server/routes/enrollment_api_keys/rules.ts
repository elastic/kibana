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
import { RuntimeEnrollmentRuleData } from '../../../common/types/domain_data';

export const createPostEnrollmentRulesRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/fleet/enrollment-api-keys/{keyId}/enrollment-rules',
  config: {},
  handler: async (
    request: FrameworkRequest<{ params: { keyId: string } }>
  ): Promise<ReturnTypeCreate<any>> => {
    const { keyId } = request.params;

    const result = RuntimeEnrollmentRuleData.decode(request.payload);
    if (isLeft(result)) {
      throw Boom.badRequest(
        `Malformed request, action is invalid, (${PathReporter.report(result)})`
      );
    }
    const rule = await libs.apiKeys.addEnrollmentRule(request.user, keyId, result.right);

    return { item: rule, success: true, action: 'created' };
  },
});

export const createGetEnrollmentRulesRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/enrollment-api-keys/{keyId}/enrollment-rules',
  config: {},
  handler: async (
    request: FrameworkRequest<{ params: { keyId: string } }>
  ): Promise<ReturnTypeList<any>> => {
    const { keyId } = request.params;
    const apiKey = await libs.apiKeys.getEnrollmentApiKey(request.user, keyId);

    if (!apiKey) {
      throw Boom.notFound('Enrollement api key not found');
    }

    return {
      list: apiKey.enrollment_rules,
      page: 1,
      total: apiKey.enrollment_rules.length,
      success: true,
      perPage: apiKey.enrollment_rules.length,
    };
  },
});

export const createDeleteEnrollmentRuleRoute = (libs: FleetServerLib) => ({
  method: 'DELETE',
  path: '/api/fleet/enrollment-api-keys/{keyId}/enrollment-rules/{ruleId}',
  config: {},
  handler: async (
    request: FrameworkRequest<{ params: { keyId: string; ruleId: string } }>
  ): Promise<ReturnTypeDelete> => {
    const { keyId, ruleId } = request.params;
    await libs.apiKeys.deleteEnrollmentRule(request.user, keyId, ruleId);

    return {
      success: true,
      action: 'deleted',
    };
  },
});
