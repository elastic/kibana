/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_ACTION_POLICY_FORM_ROLE,
  buildCreateActionPolicyData,
  buildWorkflowYaml,
  test,
} from '../fixtures';

/*
 * Browser-level round-trips for the action policy form. Both tests assert
 * through the UI *and* read the policy back through the API, so any drift
 * between what `form_utils.ts` serializes and what the create/update routes
 * accept fails the test — something the RTL suite cannot catch because it
 * asserts against a mocked client.
 */
test.describe('Action Policies - create and edit', { tag: [...tags.stateful.classic] }, () => {
  const CREATED_POLICY_NAME = 'scout-action-policy-created';
  const SEEDED_POLICY_NAME = 'scout-action-policy-to-edit';
  const EDITED_POLICY_NAME = 'scout-action-policy-edited';
  const MATCHER = 'episode_status: "active" and rule.tags: "scout"';

  let workflowId: string;
  let workflowName: string;

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    // Action policy destinations are workflow references, so the form's
    // workflows combo box needs a real workflow to offer.
    workflowName = `scout-action-policy-destination-${Date.now()}`;
    const workflow = await apiServices.alertingV2.workflows.create(buildWorkflowYaml(workflowName));
    workflowId = workflow.id;
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
  });

  test('creates a policy from the form and persists what was typed', async ({
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICY_FORM_ROLE);
    const { actionPoliciesList, actionPolicyForm } = pageObjects;

    await test.step('fill in and submit the create form', async () => {
      // `beforeAll` leaves the list empty, which hides the header create
      // button (`createActionPolicyButton`) — create options live on the
      // empty-state cards instead. Open the form by URL; empty-state vs
      // header create is covered by the list page RTL suite.
      await actionPolicyForm.gotoCreate();
      await expect(actionPolicyForm.container).toBeVisible();
      // A missing workflows privilege or a disabled `workflows:ui:enabled`
      // swaps the combo box for a callout, which would otherwise surface as an
      // opaque "option never appeared" failure.
      await expect(actionPolicyForm.workflowsDisabledCallout).toHaveCount(0);

      await actionPolicyForm.setName(CREATED_POLICY_NAME);
      await actionPolicyForm.setMatcher(MATCHER);
      await actionPolicyForm.selectWorkflow(workflowName);
      await actionPolicyForm.submit();
    });

    await test.step('the form returns to the list with the new policy', async () => {
      await expect(actionPoliciesList.detailsLink(CREATED_POLICY_NAME)).toBeVisible();
    });

    await test.step('the persisted policy matches the submitted form', async () => {
      const { items } = await apiServices.alertingV2.actionPolicies.list({
        search: CREATED_POLICY_NAME,
      });

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        name: CREATED_POLICY_NAME,
        matcher: { expression: MATCHER },
        grouping_mode: 'per_episode',
        throttle: { strategy: 'on_status_change' },
        destinations: [{ type: 'workflow', id: workflowId }],
      });
    });
  });

  test('edits an existing policy without dropping untouched fields', async ({
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    const seeded = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({
        name: SEEDED_POLICY_NAME,
        matcher: { expression: MATCHER },
        destinations: [{ type: 'workflow', id: workflowId }],
      })
    );

    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICY_FORM_ROLE);
    const { actionPoliciesList, actionPolicyForm } = pageObjects;

    await test.step('the edit form hydrates from the persisted policy', async () => {
      await actionPolicyForm.gotoEdit(seeded.id);
      await expect(actionPolicyForm.nameInput).toHaveValue(SEEDED_POLICY_NAME);
      await expect(actionPolicyForm.matcherInput).toHaveValue(MATCHER);
    });

    await test.step('rename the policy and submit', async () => {
      await actionPolicyForm.setName(EDITED_POLICY_NAME);
      await actionPolicyForm.submit();
      await expect(actionPoliciesList.detailsLink(EDITED_POLICY_NAME)).toBeVisible();
    });

    await test.step('the update carries the hydrated fields back unchanged', async () => {
      const updated = await apiServices.alertingV2.actionPolicies.get(seeded.id);

      expect(updated).toMatchObject({
        name: EDITED_POLICY_NAME,
        matcher: { expression: MATCHER },
        destinations: [{ type: 'workflow', id: workflowId }],
      });
    });
  });
});
