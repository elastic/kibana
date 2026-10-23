/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Proves that a successful workflow dispatch reports the
 * `alerting_v2_workflow_dispatched` EBT event. A breaching rule is matched by
 * an action policy whose destination is a real workflow, and the event carries
 * the ids and counts of that dispatch.
 */

import { expect } from '@kbn/scout/api';
import {
  ALERTING_V2_ACTION_POLICY_DISPATCH_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  buildWorkflowYaml,
  testData,
} from '../fixtures';

const RUN_ID = Date.now().toString(36);
const SOURCE_INDEX = `test-alerting-v2-ebt-dispatch-source-${RUN_ID}`;
const ACTION_POLICY_ID = `ebt-dispatch-policy-${RUN_ID}`;

apiTest.describe(
  'Workflow dispatched EBT telemetry',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let workflowId: string;

    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ebt.optIn();
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
        buildWorkflowYaml('scout-ebt-dispatch-workflow')
      );
      workflowId = workflow.id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ebt.optOut();
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
      await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
    });

    apiTest(
      'reports one event with the dispatch ids and counts when a policy schedules its workflow',
      async ({ apiClient, apiServices, samlAuth }) => {
        const host = 'host-ebt-dispatch';
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          ALERTING_V2_ACTION_POLICY_DISPATCH_ROLE
        );
        const createPolicyResponse = await apiClient.put(
          `${testData.ACTION_POLICY_API_PATH}/${ACTION_POLICY_ID}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            body: buildCreateActionPolicyData({
              name: 'EBT dispatch policy',
              description: 'Catch-all policy whose destination is a real workflow',
              destinations: [{ type: 'workflow', id: workflowId }],
              grouping: { mode: 'per_alert' },
              throttle: { strategy: 'every_time' },
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
            metadata: { name: 'ebt-dispatch-rule' },
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          })
        );

        const [event] = await apiServices.alertingV2.ebt.waitForWorkflowDispatchedEvents({
          workflowId,
        });

        expect(event.properties).toMatchObject({
          workflow_id: workflowId,
          action_policy_id: ACTION_POLICY_ID,
          space_id: 'default',
          rule_id: [rule.id],
          alert_count: 1,
          rule_count: 1,
          throttle_strategy: 'every_time',
          grouping_mode: 'per_alert',
        });
        expect(event.properties.workflow_execution_id.length).toBeGreaterThan(0);
      }
    );
  }
);
