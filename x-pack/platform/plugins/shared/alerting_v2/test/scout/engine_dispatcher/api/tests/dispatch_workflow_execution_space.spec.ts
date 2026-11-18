/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Proves that an action policy in a non-default space runs its workflow in that
 * space. The workflow's only step uses an `.http` connector that exists in the
 * policy's space alone, so it resolves only when the dispatcher schedules the
 * workflow with a request scoped to that space. The connector targets an HTTP
 * server started by this spec, which records the request the step sends.
 *
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` because this
 * spec does not target an HTTP endpoint. It drives the alerting_v2 background
 * tasks via source data and observes the workflow executions.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import http from 'http';
import { expect } from '@kbn/scout/api';
import {
  ALERTING_V2_ACTION_POLICY_CONNECTOR_DISPATCH_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  buildHttpConnectorWorkflowYaml,
  testData,
} from '../fixtures';

const SPACE_ID = 'dispatch-workflow-space';
const SOURCE_INDEX = 'test-alerting-v2-dispatch-workflow-space-source';
const ACTION_POLICY_ID = 'dispatch-workflow-space-policy';
const ACTION_POLICY_TRIGGER = 'action_policy';
const RECEIVER_PATH = '/dispatch-workflow-space';
const MARKER = 'dispatch-workflow-space-marker';

// The connector calls a server running in the test process, which only a local
// Kibana can reach.
apiTest.describe(
  'Dispatcher runs the workflow of an action policy in a non-default space',
  { tag: ['@local-stateful-classic'] },
  () => {
    const receivedBodies: string[] = [];
    const receiver = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        if (req.url === RECEIVER_PATH) {
          receivedBodies.push(body);
        }
        res.writeHead(204);
        res.end();
      });
    });
    let connectorId: string;
    let workflowId: string;

    apiTest.beforeAll(async ({ apiServices }) => {
      await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
      const address = receiver.address();
      if (!address || typeof address === 'string') {
        throw new Error('HTTP receiver did not bind to a TCP port');
      }
      const { port } = address;

      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.spaces.delete(SPACE_ID);
      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });

      await apiServices.alertingV2.sourceIndex.create({
        index: SOURCE_INDEX,
        mappings: {
          'host.name': { type: 'keyword' },
          value: { type: 'long' },
        },
      });

      // The connector exists only in SPACE_ID: a default-space lookup cannot find it.
      const connector: { id: string } = await apiServices.alerting.connectors.create(
        {
          name: 'scout-dispatch-workflow-space-http',
          connectorTypeId: '.http',
          config: { url: `http://127.0.0.1:${port}`, authType: null },
        },
        SPACE_ID
      );
      connectorId = connector.id;

      const workflow = await apiServices.alertingV2.workflows.create(
        buildHttpConnectorWorkflowYaml({
          name: 'scout-dispatch-workflow-space',
          connectorId,
          path: RECEIVER_PATH,
          marker: MARKER,
        }),
        { spaceId: SPACE_ID }
      );
      workflowId = workflow.id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp({ spaceId: SPACE_ID });
      await apiServices.alertingV2.workflows.bulkDelete([workflowId], { spaceId: SPACE_ID });
      await apiServices.alerting.connectors.delete(connectorId, SPACE_ID);
      await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
      await apiServices.spaces.delete(SPACE_ID);
      await new Promise((resolve) => receiver.close(resolve));
    });

    apiTest(
      'a breaching rule fires the policy and its workflow runs the space-only connector',
      async ({ apiClient, apiServices, samlAuth }) => {
        const host = 'host-dispatch-workflow-space';

        // The policy stores an API key minted from the request credential, so it is created
        // with an interactive user session, like the UI does.
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          ALERTING_V2_ACTION_POLICY_CONNECTOR_DISPATCH_ROLE
        );
        const createPolicyResponse = await apiClient.put(
          `/s/${SPACE_ID}${testData.ACTION_POLICY_API_PATH}/${ACTION_POLICY_ID}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            body: buildCreateActionPolicyData({
              name: 'Dispatch workflow space policy',
              description: 'Catch-all policy whose workflow uses a space-only connector',
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
            metadata: { name: 'dispatch-workflow-execution-space' },
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          }),
          { spaceId: SPACE_ID }
        );

        // The dispatcher matched the alert to the policy.
        await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(1, {
          ruleId: rule.id,
          actionTypes: ['fire'],
        });

        await apiServices.alertingV2.workflows.waitForSuccessfulExecution(workflowId, {
          triggeredBy: ACTION_POLICY_TRIGGER,
          spaceId: SPACE_ID,
        });

        // The connector resolved in SPACE_ID and sent the workflow's request.
        const markers = receivedBodies.map((body) => JSON.parse(body).marker);
        expect(markers).toContain(MARKER);
      }
    );
  }
);
