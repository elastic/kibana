/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { SecretsUnavailableError } from '@kbn/secrets';
import { WORKFLOWS_SECRETS_CONSUMER_ID } from '@kbn/workflows';
import { registerSecretsRoutes } from './register_secrets_routes';
import type { WorkflowsRouter, WorkflowsServerPluginStartDeps } from '../types';

export { workflowSecretsSubFeature } from './secrets_sub_feature';

/**
 * Sets up everything workflow secrets add to the plugin, except their privileges: those are
 * `workflowSecretsSubFeature`, which joins the feature registration.
 * Runs only with `workflowsManagement.secrets.enabled`.
 */
export const setupWorkflowSecrets = ({
  core,
  router,
}: {
  core: CoreSetup<WorkflowsServerPluginStartDeps>;
  router: WorkflowsRouter;
}): void => {
  registerSecretsRoutes({
    router,
    getSecretsClient: async (request) => {
      const [, { secrets }] = await core.getStartServices();
      if (!secrets) {
        throw new SecretsUnavailableError('The secrets plugin is not available.');
      }
      return secrets.getClient({ request, consumer: WORKFLOWS_SECRETS_CONSUMER_ID });
    },
  });
};
