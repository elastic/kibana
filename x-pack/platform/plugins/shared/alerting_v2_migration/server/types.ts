/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AlertingServerStart as ClassicAlertingServerStart } from '@kbn/alerting-plugin/server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { RuleMigrationClient, RuleMigrationDefinition } from './lib/rule_migration';

export type RuleMigrationClientApi = PublicMethodsOf<RuleMigrationClient>;

export interface AlertingV2MigrationServerSetup {
  ruleMigrations: {
    /**
     * Makes a classic rule type migratable to v2. The owner converts its params and supplies a
     * default action message; this plugin converts rule-level fields and actions. Registering
     * a rule type twice throws.
     */
    register(definition: RuleMigrationDefinition): void;
  };
}

export interface AlertingV2MigrationServerStart {
  /**
   * Returns a client that converts classic rules of registered rule types into v2 rules and
   * action policies, creating them with the request's credentials in its space.
   */
  getRuleMigrationClientWithRequest(request: KibanaRequest): Promise<RuleMigrationClientApi>;
}

export interface AlertingV2MigrationSetupDependencies {
  workflowsManagement: WorkflowsServerPluginSetup;
  agentBuilder?: AgentBuilderPluginSetup;
  cloud?: CloudSetup;
}

export interface AlertingV2MigrationStartDependencies {
  alerting: ClassicAlertingServerStart;
  alertingVTwo: AlertingV2ServerStart;
  spaces: SpacesPluginStart;
}
