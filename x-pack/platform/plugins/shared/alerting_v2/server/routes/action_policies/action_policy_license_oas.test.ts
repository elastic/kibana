/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_POLICY_LICENSE_NOT_SUPPORTED_RESPONSE } from './action_policy_oas_shared_examples';
import { ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION } from './action_policy_route_descriptions';
import { BulkEnableActionPoliciesRoute } from './bulk_enable_action_policies_route';
import { CreateActionPolicyRoute } from './create_action_policy_route';
import { DeleteActionPolicyRoute } from './delete_action_policy_route';
import { DisableActionPolicyRoute } from './disable_action_policy_route';
import { EnableActionPolicyRoute } from './enable_action_policy_route';
import { UpdateActionPolicyRoute } from './update_action_policy_route';
import { UpsertActionPolicyRoute } from './upsert_action_policy_route';

const { name, summary, value } = ACTION_POLICY_LICENSE_NOT_SUPPORTED_RESPONSE;

const forbiddenExamples = (examples: Record<string, unknown>) => ({
  responses: { 403: { content: { 'application/json': { examples } } } },
});

describe('action policy license OAS documentation', () => {
  describe.each([
    ['create', CreateActionPolicyRoute],
    ['update', UpdateActionPolicyRoute],
    ['upsert', UpsertActionPolicyRoute],
    ['enable', EnableActionPolicyRoute],
    ['bulk enable', BulkEnableActionPoliciesRoute],
  ])('%s route', (_, Route) => {
    it('documents the license 403 description', () => {
      expect(Route.validate).toMatchObject({
        response: { 403: { description: ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION } },
      });
    });

    it('lists the license example next to the shared privileges example', async () => {
      expect(await Route.options.oasOperationObject?.()).toMatchObject(
        forbiddenExamples({ forbidden: expect.any(Object), [name]: { summary, value } })
      );
    });
  });

  describe.each([
    ['disable', DisableActionPolicyRoute],
    ['delete', DeleteActionPolicyRoute],
  ])('%s route', (_, Route) => {
    it('does not document the license 403', async () => {
      expect(await Route.options.oasOperationObject?.()).not.toMatchObject(
        forbiddenExamples({ [name]: expect.anything() })
      );
    });
  });
});
