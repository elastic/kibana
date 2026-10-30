/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Proves the default email message of a simple workflow renders in the standard alert
 * layout when the dispatcher runs it. A rule breaches for two hosts, the dispatcher sends
 * both alerts in one group to a workflow built from the default email template, and the
 * spec reads the rendered message and the sent email back from the workflow execution.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  ALERTING_V2_ACTION_POLICY_CONNECTOR_DISPATCH_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  buildDefaultEmailWorkflowYaml,
  testData,
} from '../fixtures';

const SOURCE_INDEX = 'test-alerting-v2-dispatch-default-email-source';
const ACTION_POLICY_ID = 'dispatch-default-email-policy';
const ACTION_POLICY_TRIGGER = 'action_policy';
const RULE_NAME = 'Scout default email rule';
const HOSTS = ['host-default-email-a', 'host-default-email-b'];
// The test waits for the alerts to fire and then for the workflow to complete, each for up
// to `POLL_TIMEOUT_MS`, so it needs a budget above the 60s default to stay off the edge.
const TEST_TIMEOUT_MS = 120_000;
// The `date` filter formats in the Kibana server's time zone, which the spec cannot know,
// so event times are masked and only their format is checked.
const EVENT_TIME = /Last event \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/g;

interface DispatchedAlert {
  alert_id: string;
  alert_url: string;
}

// Running the workflow needs the dispatcher to mint a UIAM API key, which requires
// `xpack.task_manager.grant_uiam_api_keys=true`. MKI sets it, so this runs on cloud
// serverless; the default Scout serverless config does not, so local serverless is
// excluded (hence `@cloud-serverless-observability_complete`, not the local tag).
apiTest.describe(
  'Dispatcher runs the default email workflow of a simple workflow',
  { tag: [...tags.stateful.all, '@cloud-serverless-observability_complete'] },
  () => {
    let connectorId: string;
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

      const connector: { id: string } = await apiServices.alerting.connectors.create({
        name: 'scout-dispatch-default-email',
        connectorTypeId: '.email',
        config: { from: 'alerts@example.com', service: '__json' },
        secrets: { user: 'user', password: 'password' },
      });
      connectorId = connector.id;

      const workflow = await apiServices.alertingV2.workflows.create(
        buildDefaultEmailWorkflowYaml({ name: 'scout-dispatch-default-email', connectorId })
      );
      workflowId = workflow.id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
      await apiServices.alerting.connectors.delete(connectorId);
      await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
    });

    apiTest(
      'a breaching rule sends one email listing every alert in the standard layout',
      async ({ apiClient, apiServices, samlAuth }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);

        // The policy stores an API key minted from the request credential, so it is
        // created with an interactive user session, like the UI does. The workflow's email
        // step runs as that user, who needs read access to connectors.
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          ALERTING_V2_ACTION_POLICY_CONNECTOR_DISPATCH_ROLE
        );
        const createPolicyResponse = await apiClient.put(
          `${testData.ACTION_POLICY_API_PATH}/${ACTION_POLICY_ID}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            body: buildCreateActionPolicyData({
              name: 'Dispatch default email policy',
              description: 'Sends every alert of a dispatch in one default email',
              destinations: [{ type: 'workflow', id: workflowId }],
              grouping: { mode: 'all' },
            }),
          }
        );
        expect(createPolicyResponse).toHaveStatusCode(201);

        // Both hosts breach in the rule's first run, so the dispatcher groups them together.
        await apiServices.alertingV2.sourceIndex.indexDocs({
          index: SOURCE_INDEX,
          docs: HOSTS.map((host) => ({
            '@timestamp': new Date().toISOString(),
            'host.name': host,
            value: 1,
          })),
        });

        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            metadata: { name: RULE_NAME },
            query: {
              base: `FROM ${SOURCE_INDEX} | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          })
        );

        await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(HOSTS.length, {
          ruleId: rule.id,
          actionTypes: ['fire'],
        });

        const executionId = await apiServices.alertingV2.workflows.waitForSuccessfulExecution(
          workflowId,
          { triggeredBy: ACTION_POLICY_TRIGGER }
        );
        const { context, stepExecutions } = await apiServices.alertingV2.workflows.getExecution(
          executionId
        );
        const { alerts } = (context?.inputs as { payload: { alerts: DispatchedAlert[] } }).payload;
        expect(alerts).toHaveLength(HOSTS.length);

        const notifyStep = stepExecutions.find(({ stepId }) => stepId === 'notify');
        expect(notifyStep?.status).toBe('completed');

        const { message } = notifyStep?.input as { message: string };
        const [first, second] = alerts;

        // The first two lines of each alert end with `\`, a Markdown line break.
        expect(message.replace(EVENT_TIME, 'Last event <time> UTC')).toBe(
          [
            '**2 alerts**',
            '',
            `**${RULE_NAME}** — Active\\`,
            `Last event <time> UTC · [View in app](${first.alert_url})\\`,
            `Alert id: ${first.alert_id}`,
            '',
            `**${RULE_NAME}** — Active\\`,
            `Last event <time> UTC · [View in app](${second.alert_url})\\`,
            `Alert id: ${second.alert_id}`,
            '',
          ].join('\n')
        );

        // The email connector turns the Markdown into the HTML that is sent.
        const { html } = (notifyStep?.output as { message: { html: string } }).message;
        for (const { alert_url: alertUrl } of alerts) {
          expect(html).toContain(`<strong>${RULE_NAME}</strong> — Active<br>`);
          expect(html).toContain(`<a href="${alertUrl}">View in app</a>`);
        }
      }
    );
  }
);
