/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Container } from 'inversify';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger, KibanaRequest } from '@kbn/core/server';
import { CoreStart } from '@kbn/core-di-server';
import { PluginStart } from '@kbn/core-di';
import type { AlertingServerStartDependencies } from '../types';
import { RulesSavedObjectService } from '../lib/services/rules_saved_object_service/rules_saved_object_service';
import { UserService } from '../lib/services/user_service/user_service';
import { RulesClient } from '../lib/rules_client/rules_client';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { createUpdateRuleTool } from './update_rule_tool';

/**
 * Creates a factory that produces a request-scoped RulesClient by resolving
 * start-time services from the DI container. Must only be called after the
 * plugin start lifecycle has completed.
 */
const buildScopedRulesClientFactory = (container: Container) => {
  return (request: KibanaRequest): RulesClient => {
    const http = container.get(CoreStart('http'));
    const savedObjects = container.get(CoreStart('savedObjects'));
    const userProfile = container.get(CoreStart('userProfile'));
    const taskManager = container.get(
      PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager')
    );
    const spaces = container.get(
      PluginStart<AlertingServerStartDependencies['spaces']>('spaces')
    );

    const soClient = savedObjects.getScopedClient(request, {
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    });

    const rulesSoService = new RulesSavedObjectService(soClient, spaces);
    const userService = new UserService(request, userProfile);

    return new RulesClient(request, http, rulesSoService, taskManager, userService);
  };
};

export const registerAlertingV2Tools = (
  agentBuilder: AgentBuilderPluginSetup,
  container: Container,
  logger: Logger
): void => {
  const getRulesClient = buildScopedRulesClientFactory(container);
  agentBuilder.tools.register(createUpdateRuleTool(getRulesClient, logger));
};
