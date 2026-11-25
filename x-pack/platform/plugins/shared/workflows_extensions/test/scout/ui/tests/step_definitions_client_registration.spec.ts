/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { CLIENT_REGISTRATION_EXCEPTIONS } from '../fixtures/client_registration_exceptions';

const STEPS_GUIDE =
  'x-pack/platform/plugins/shared/workflows_extensions/dev_docs/STEPS.md#server-and-client-registration-check';
const EXCEPTIONS_FILE =
  'x-pack/platform/plugins/shared/workflows_extensions/test/scout/ui/fixtures/client_registration_exceptions.ts';

/** Lists every step that is not registered on both sides, and every exception that is no longer needed. */
const findRegistrationIssues = (serverStepIds: string[], clientStepIds: string[]): string[] => {
  const serverStepIdSet = new Set(serverStepIds);
  const clientStepIdSet = new Set(clientStepIds);
  const exceptions = new Set(CLIENT_REGISTRATION_EXCEPTIONS);

  const missingOnClient = serverStepIds.filter(
    (id) => !clientStepIdSet.has(id) && !exceptions.has(id)
  );
  const missingOnServer = clientStepIds.filter((id) => !serverStepIdSet.has(id));
  const staleExceptions = CLIENT_REGISTRATION_EXCEPTIONS.filter(
    (id) => serverStepIdSet.has(id) && clientStepIdSet.has(id)
  );

  return [
    ...missingOnClient.map(
      (id) =>
        `Step "${id}" is registered on the server but not on the client: the workflow editor will reject it as an unknown step type. Register it with \`workflowsExtensions.registerStepDefinition\` in your plugin's public setup().`
    ),
    ...missingOnServer.map(
      (id) =>
        `Step "${id}" is registered on the client but not on the server: workflows using it will fail to run. Register it with \`workflowsExtensions.registerStepDefinition\` in your plugin's server setup().`
    ),
    ...staleExceptions.map(
      (id) =>
        `Step "${id}" is now registered on both the server and the client: remove it from ${EXCEPTIONS_FILE}.`
    ),
  ];
};

test.describe(
  'Workflows Extensions - Custom Step Definitions Client Registration',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
      ...tags.serverless.security.ease,
      ...tags.serverless.observability.complete,
      ...tags.serverless.vectordb,
    ],
  },
  () => {
    let serverStepIds: string[];

    test.beforeAll(async ({ kbnClient }) => {
      const { data } = await kbnClient.request<{ steps: Array<{ id: string }> }>({
        method: 'GET',
        path: '/internal/workflows_extensions/step_definitions',
      });
      serverStepIds = data.steps.map(({ id }) => id);
    });

    test.beforeEach(async ({ browserAuth }) => {
      // Public loaders can skip a registration based on the current user, so log in with the
      // most privileged role to get the complete client-side registry.
      await browserAuth.loginAsAdmin();
    });

    test('should register every custom step on both the server and the client', async ({
      pageObjects,
    }) => {
      await pageObjects.clientStepRegistry.goto();
      const clientStepIds = await pageObjects.clientStepRegistry.getStepDefinitionIds();

      const issues = findRegistrationIssues(serverStepIds, clientStepIds);

      expect(issues, {
        message: `Found ${issues.length} custom step registration issue(s):\n\n${issues.join(
          '\n'
        )}\n\nSee ${STEPS_GUIDE}`,
      }).toStrictEqual([]);
    });
  }
);
