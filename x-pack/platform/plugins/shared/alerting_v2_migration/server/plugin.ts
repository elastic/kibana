/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { createAlertingV2Availability } from '@kbn/alerting-v2-plugin/server';
import { createRuleMigrationClientFactory, RuleMigrationRegistry } from './lib/rule_migration';
import { registerSkills } from './agent_builder/register_skills';
import type {
  AlertingV2MigrationServerSetup,
  AlertingV2MigrationServerStart,
  AlertingV2MigrationSetupDependencies,
  AlertingV2MigrationStartDependencies,
} from './types';

export class AlertingV2MigrationPlugin
  implements
    Plugin<
      AlertingV2MigrationServerSetup,
      AlertingV2MigrationServerStart,
      AlertingV2MigrationSetupDependencies,
      AlertingV2MigrationStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly registry = new RuleMigrationRegistry();
  private workflowsManagement?: AlertingV2MigrationSetupDependencies['workflowsManagement']['management'];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<AlertingV2MigrationStartDependencies, AlertingV2MigrationServerStart>,
    { workflowsManagement, agentBuilder, cloud }: AlertingV2MigrationSetupDependencies
  ): AlertingV2MigrationServerSetup {
    this.workflowsManagement = workflowsManagement.management;

    if (agentBuilder) {
      const getStartPlugins = async () => {
        const [, startPlugins] = await core.getStartServices();
        return startPlugins;
      };

      registerSkills(agentBuilder, {
        logger: this.logger.get('agentBuilder'),
        getClassicRulesClient: async (request) =>
          (await getStartPlugins()).alerting.getRulesClientWithRequest(request),
        isMigratable: (ruleTypeId) => this.registry.has(ruleTypeId),
        availability: createAlertingV2Availability({
          getActiveSpace: async (request) =>
            (await getStartPlugins()).spaces.spacesService.getActiveSpace(request),
          projectType: cloud?.serverless.projectType,
        }),
      });
    }

    return {
      ruleMigrations: {
        register: (definition) => {
          this.registry.register(definition);
        },
      },
    };
  }

  public start(
    _core: CoreStart,
    { alertingVTwo, spaces }: AlertingV2MigrationStartDependencies
  ): AlertingV2MigrationServerStart {
    const { registry, workflowsManagement } = this;
    if (!workflowsManagement) {
      throw new Error('alertingVTwoMigration plugin start was called before setup');
    }

    return {
      getRuleMigrationClientWithRequest: createRuleMigrationClientFactory({
        registry,
        workflowsManagement,
        alertingVTwo,
        spacesService: spaces.spacesService,
        logger: this.logger.get('ruleMigration'),
      }),
    };
  }

  public stop() {}
}
