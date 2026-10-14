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
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  buildWorkflowYaml,
  testData,
} from '../fixtures';

const SOURCE_INDEX = 'test-alerting-v2-dispatch-workflow-source';
const ACTION_POLICY_ID = 'dispatch-workflow-policy';
const ACTION_POLICY_TRIGGER = 'action_policy';

apiTest.describe(
  'Dispatcher runs the workflow of an action policy',
  { tag: tags.stateful.classic },
  () => {
    let workflowId: string;

    apiTest.beforeAll(async ({ apiClient, apiServices, log, samlAuth }) => {
      log.info('Cleaning up alert events, rule events, rules and action policies');
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();

      log.info(`Creating source index [${SOURCE_INDEX}]`);
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
      log.info(`Created workflow [${workflowId}]`);

      // The policy stores an API key minted from the request credential. With UIAM (serverless)
      // that must be a UIAM credential, which basic auth used by `apiServices` is not, so the
      // policy is created with an interactive user session, like the UI does.
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
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
      log.info(
        `Created action policy [${ACTION_POLICY_ID}] with destination workflow [${workflowId}]`
      );
    });

    apiTest.afterAll(async ({ apiServices, log }) => {
      log.info('Cleaning up test data');
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
      await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
    });

    apiTest(
      'a breaching rule fires the policy and its workflow runs to completion',
      async ({ apiServices, log }) => {
        const host = 'host-dispatch-workflow';

        log.info(`Indexing a breaching document for host [${host}]`);
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
        log.info(`Created rule [${rule.id}], waiting for the dispatcher to fire the policy`);

        // The dispatcher matched the alert to the policy.
        await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(1, {
          ruleId: rule.id,
          actionTypes: ['fire'],
        });
        log.info(`Dispatcher recorded a fire action for rule [${rule.id}]`);

        // The policy destination was started as a workflow execution that finished.
        log.info(`Waiting for a finished execution of workflow [${workflowId}]`);
        const execution = await apiServices.alertingV2.workflows.waitForFinishedExecution(
          workflowId
        );
        log.info(
          `Workflow execution [${execution.id}] finished: status=${execution.status}, ` +
            `triggeredBy=${execution.triggeredBy}, executedBy=${execution.executedBy}, ` +
            `error=${JSON.stringify(execution.error)}`
        );

        expect(execution.status).toBe('completed');
        expect(execution.error).toBeNull();
        expect(execution.triggeredBy).toBe(ACTION_POLICY_TRIGGER);
        // An execution without a resolved identity is stored as `unknown`.
        expect(execution.executedBy).toBeDefined();
        expect(execution.executedBy).not.toBe('unknown');
      }
    );
  }
);
