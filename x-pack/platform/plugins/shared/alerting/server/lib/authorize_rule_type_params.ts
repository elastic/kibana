/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RuleTypeParams, RuleTypeParamsAuthorizer } from '../types';

/**
 * Runs a rule type's optional params authorizer on a rule write path
 * (create/update/bulk), after the params have been validated.
 *
 * Thrown errors are not wrapped: the authorizer is responsible for throwing an
 * HTTP-appropriate error (for example a `Boom.forbidden` for a privilege failure
 * or `Boom.badRequest` for an invalid privileged payload), so that the status
 * code is preserved when the write is driven through the generic Alerting APIs.
 */
export async function authorizeRuleTypeParams<Params extends RuleTypeParams>(
  params: Params,
  authorizer: RuleTypeParamsAuthorizer<Params> | undefined,
  context: { request: KibanaRequest; spaceId: string; previousParams?: Params }
): Promise<void> {
  if (!authorizer) {
    return;
  }

  await authorizer.authorize(params, context);
}
