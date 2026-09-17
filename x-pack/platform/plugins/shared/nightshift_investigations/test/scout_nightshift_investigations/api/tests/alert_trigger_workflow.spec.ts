/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID,
  getManagedWorkflowSelectorVisibilityContext,
} from '@kbn/workflows/managed';
import { apiTest, COMMON_HEADERS, uniqueId } from '../fixtures';

const WORKFLOW_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
} as const;

const RULE_ACTION_VISIBILITY = getManagedWorkflowSelectorVisibilityContext('rule_action');

const PICKER_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { workflowsManagement: ['all'], stackAlerts: ['all'] },
      spaces: ['*'],
    },
  ],
};

interface WorkflowListBody {
  results: Array<{ id: string; name: string; enabled: boolean }>;
}

interface WorkflowDetailBody {
  id: string;
  name: string;
  enabled: boolean;
  yaml: string;
  definition: { triggers?: Array<{ type: string }> } | null;
}

interface CreatedRuleBody {
  id: string;
  enabled: boolean;
  actions: Array<{ id: string; params: { subActionParams?: { workflowId?: string } } }>;
}

apiTest.describe(
  'v1 alert Nightshift investigation trigger',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let credentials: RoleApiCredentials;
    let headers: Record<string, string>;
    let createdRuleId: string | undefined;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(PICKER_ROLE);
      headers = { ...WORKFLOW_HEADERS, ...credentials.apiKeyHeader };
    });

    apiTest.afterEach(async ({ apiClient }) => {
      if (!createdRuleId) {
        return;
      }
      await apiClient.delete(`api/alerting/rule/${createdRuleId}`, { headers });
      createdRuleId = undefined;
    });

    apiTest(
      'is installed as an enabled managed workflow with an alert trigger',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `api/workflows/workflow/${NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID}`,
          { headers, responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);

        const workflow = response.body as WorkflowDetailBody;
        expect(workflow.id).toBe(NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID);
        expect(workflow.enabled).toBe(true);
        expect(workflow.name).toBe('[Experimental] Nightshift Investigation from an Alert rule');
        expect(workflow.definition?.triggers).toStrictEqual([{ type: 'alert' }]);
        expect(workflow.yaml).toContain('nightshift.triggerInvestigation');
      }
    );

    apiTest('appears in the v1 rule-action picker list', async ({ apiClient }) => {
      const response = await apiClient.get(
        `api/workflows?managed=all&visibilityContext=${encodeURIComponent(
          RULE_ACTION_VISIBILITY
        )}&size=1000&page=1`,
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const { results } = response.body as WorkflowListBody;
      expect(
        results.some(
          (workflow) => workflow.id === NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID
        )
      ).toBe(true);
    });

    apiTest(
      'can be attached to a disabled v1 stack rule',
      { tag: [...tags.stateful.classic] },
      async ({ apiClient }) => {
        const createResponse = await apiClient.post('api/alerting/rule', {
          headers,
          responseType: 'json',
          body: {
            name: uniqueId('nightshift-alert-trigger-rule'),
            rule_type_id: '.index-threshold',
            consumer: 'stackAlerts',
            schedule: { interval: '1m' },
            enabled: false,
            params: {
              aggType: 'count',
              termSize: 5,
              thresholdComparator: '>',
              timeWindowSize: 5,
              timeWindowUnit: 'm',
              groupBy: 'all',
              threshold: [1000000],
              index: ['.kibana-event-log-*'],
              timeField: '@timestamp',
            },
            actions: [
              {
                id: 'system-connector-.workflows',
                params: {
                  subAction: 'run',
                  subActionParams: {
                    workflowId: NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID,
                    summaryMode: true,
                  },
                },
              },
            ],
            tags: [],
          },
        });
        expect(createResponse).toHaveStatusCode(200);

        const rule = createResponse.body as CreatedRuleBody;
        createdRuleId = rule.id;
        expect(rule.enabled).toBe(false);
        const workflowAction = rule.actions.find(
          (action) => action.id === 'system-connector-.workflows'
        );
        expect(workflowAction?.params.subActionParams?.workflowId).toBe(
          NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID
        );
      }
    );
  }
);
