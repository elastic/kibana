/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuntimeServices } from '@kbn/security-solution-plugin/scripts/endpoint/common/stack_services';
import { SecurityRoleAndUserLoader } from '@kbn/test-suites-serverless/shared/lib';
import type {
  LoadedRoleAndUser,
  YamlRoleDefinitions,
} from '@kbn/test-suites-serverless/shared/lib';
import type { LoadUserAndRoleCyTaskOptions } from './e2e';

interface AdditionalDefinitions {
  roleDefinitions?: YamlRoleDefinitions;
  additionalRoleName?: string;
}
export const setupUserDataLoader = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  { roleDefinitions, additionalRoleName }: AdditionalDefinitions
) => {
  const stackServicesPromise = createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.KIBANA_USERNAME,
    password: config.env.KIBANA_PASSWORD,
    esUsername: config.env.ELASTICSEARCH_USERNAME,
    esPassword: config.env.ELASTICSEARCH_PASSWORD,
  });

  const roleAndUserLoaderPromise: Promise<SecurityRoleAndUserLoader> = stackServicesPromise.then(
    ({ kbnClient, log }) => new SecurityRoleAndUserLoader(kbnClient, log, roleDefinitions)
  );

  on('task', {
    /**
     * Loads a user/role into Kibana. Used from `login()` task.
     * @param name
     */
    loadUserAndRole: async ({ name }: LoadUserAndRoleCyTaskOptions): Promise<LoadedRoleAndUser> =>
      (await roleAndUserLoaderPromise).load(name, additionalRoleName),
  });
};
