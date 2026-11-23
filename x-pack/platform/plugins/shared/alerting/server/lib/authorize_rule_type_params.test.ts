/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { authorizeRuleTypeParams } from './authorize_rule_type_params';
import type { RuleTypeParams, RuleTypeParamsAuthorizer } from '../types';

const request = httpServerMock.createKibanaRequest();
const spaceId = 'default';

test('resolves without calling anything when no authorizer is provided', async () => {
  await expect(
    authorizeRuleTypeParams({ foo: true }, undefined, { request, spaceId })
  ).resolves.toBeUndefined();
});

test('calls the authorizer with params and context', async () => {
  const authorize = jest.fn().mockResolvedValue(undefined);
  const authorizer: RuleTypeParamsAuthorizer<RuleTypeParams> = { authorize };
  const params = { foo: true };
  const previousParams = { foo: false };

  await authorizeRuleTypeParams(params, authorizer, { request, spaceId, previousParams });

  expect(authorize).toHaveBeenCalledTimes(1);
  expect(authorize).toHaveBeenCalledWith(params, { request, spaceId, previousParams });
});

test('propagates the error thrown by the authorizer without wrapping it', async () => {
  const error = new Error('not authorized');
  const authorizer: RuleTypeParamsAuthorizer<RuleTypeParams> = {
    authorize: jest.fn().mockRejectedValue(error),
  };

  await expect(
    authorizeRuleTypeParams({ foo: true }, authorizer, { request, spaceId })
  ).rejects.toBe(error);
});
