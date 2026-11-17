/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Proves that an action policy actually runs its workflow. A breaching rule is
 * created against a real source index, the dispatcher matches it to a policy
 * whose destination is a real workflow, and the workflow ends up with a
 * completed execution.
 *
 * Other dispatcher specs only assert the `fire` and `notified` actions recorded
 * in `.alert-actions`, which are written even when the destination workflow
 * does not exist or cannot be started.
 *
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` because this
 * spec does not target an HTTP endpoint. It drives the alerting_v2 background
 * tasks via source data and observes the workflow executions.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  ALERTING_V2_ACTION_POLICY_DISPATCH_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  buildWorkflowYaml,
  testData,
} from '../fixtures';

const SOURCE_INDEX = 'test-alerting-v2-dispatch-workflow-source';
const ACTION_POLICY_ID = 'dispatch-workflow-policy';
const ACTION_POLICY_TRIGGER = 'action_policy';

// Running the workflow needs the dispatcher to mint a UIAM API key, which requires
// `xpack.task_manager.grant_uiam_api_keys=true`. MKI sets it, so this runs on cloud
// serverless; the default Scout serverless config does not, so local serverless is
// excluded (hence `@cloud-serverless-observability_complete`, not the local tag).
apiTest.describe(
  'Dispatcher runs the workflow of an action policy',
  { tag: [...tags.stateful.all, '@cloud-serverless-observability_complete'] },
  () => {
    let workflowId: string;

    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();

      await apiServices.alertingV2.sourceIndex.create({
        index: SOURCE_INDEX,
        mappings: {
          'host.name': { type: 'keyword' },
          value: { type: 'long' },
        },
      });

      const workflow = await apiServices.alertingV2.workflows.create(
        buildWorkflowYaml('scout-dispatch-workflow-execution')
      );
      workflowId = workflow.id;
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.cleanUp();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
      await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
    });

    apiTest(
      'a breaching rule fires the policy and its workflow runs to completion',
      async ({ apiClient, apiServices, samlAuth }) => {
        const host = 'host-dispatch-workflow';

        // The policy stores an API key minted from the request credential. With UIAM (serverless)
        // that must be a UIAM credential, which basic auth used by `apiServices` is not, so the
        // policy is created with an interactive user session, like the UI does.
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          ALERTING_V2_ACTION_POLICY_DISPATCH_ROLE
        );
        const createPolicyResponse = await apiClient.put(
          `${testData.ACTION_POLICY_API_PATH}/${ACTION_POLICY_ID}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            body: buildCreateActionPolicyData({
              name: 'Dispatch workflow policy',
              description: 'Catch-all policy whose destination is a real workflow',
              destinations: [{ type: 'workflow', id: workflowId }],
            }),
          }
        );
        expect(createPolicyResponse).toHaveStatusCode(201);

        await apiServices.alertingV2.sourceIndex.indexDocs({
          index: SOURCE_INDEX,
          docs: [{ '@timestamp': new Date().toISOString(), 'host.name': host, value: 1 }],
        });

        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            metadata: { name: 'dispatch-workflow-execution' },
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          })
        );

        // The dispatcher matched the alert to the policy.
        await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(1, {
          ruleId: rule.id,
          actionTypes: ['fire'],
        });

        await apiServices.alertingV2.workflows.waitForSuccessfulExecution(workflowId, {
          triggeredBy: ACTION_POLICY_TRIGGER,
        });

        // A real, delivered dispatch is the only way to exercise the successful-dispatch
        // aggregations of the snapshot telemetry against Elasticsearch. Counters are lower bounds
        // since the event log is shared with the other specs of this config.
        const state = await apiServices.alertingV2.telemetry.runAndWaitForState();

        expect(state.has_errors).toBe(false);
        expect(state.dispatcher_alerts_count_by_outcome_24hr?.dispatched).toBeGreaterThanOrEqual(1);
        expect(
          state.dispatcher_action_groups_count_by_outcome_24hr?.dispatched
        ).toBeGreaterThanOrEqual(1);
        expect(state.dispatcher_unique_alerts_dispatched_count_24hr).toBeGreaterThanOrEqual(1);
        expect(state.dispatcher_workflow_executions_count_24hr).toBeGreaterThanOrEqual(1);
        expect(state.dispatcher_unique_workflows_triggered_count_24hr).toBeGreaterThanOrEqual(1);
        expect(state.dispatcher_notifying_executions_count_24hr).toBeGreaterThanOrEqual(1);
        expect(state.dispatcher_notifying_spaces_count_24hr).toBeGreaterThanOrEqual(1);
        expect(state.dispatcher_policies_count_by_activity_24hr?.dispatched).toBeGreaterThanOrEqual(
          1
        );
        for (const distribution of [
          state.dispatcher_action_groups_dispatched_per_policy_24hr,
          state.dispatcher_alerts_dispatched_per_policy_24hr,
          state.dispatcher_workflow_executions_per_policy_24hr,
        ]) {
          expect(distribution?.p50).toBeGreaterThanOrEqual(1);
          expect(distribution?.p99).toBeGreaterThanOrEqual(1);
          expect(distribution?.avg).toBeGreaterThanOrEqual(1);
        }
        // Policies that dispatched but never throttled have a ratio of 0, not a missing one.
        expect(state.dispatcher_throttle_ratio_per_policy_24hr?.p50).toBeGreaterThanOrEqual(0);
      }
    );
  }
);
