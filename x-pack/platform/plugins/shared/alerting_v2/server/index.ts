/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { PluginConfig } from './config';
import { configSchema } from './config';
import { bindAgentBuilder } from './setup/bind_agent_builder';
import { bindArtifactTypes } from './setup/bind_artifact_types';
import { bindContract } from './setup/bind_contract';
import { bindOnSetup } from './setup/bind_on_setup';
import { bindOnStart } from './setup/bind_on_start';
import { bindRoutes } from './setup/bind_routes';
import { bindServices } from './setup/bind_services';
import { bindEvents } from './setup/bind_events';
import { bindRuleExecutionServices } from './setup/bind_rule_executor';
import { bindDispatcherExecutionServices } from './setup/bind_dispatcher_executor';
import { bindTasks } from './setup/bind_tasks';

export const config: PluginConfigDescriptor<PluginConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    rules: { minimumScheduleInterval: true },
  },
  // Exposed as dynamic config solely for testing: it lets Scout tests
  // flip the ES|QL response format at runtime via the `PUT /internal/core/_settings`
  // API to exercise the Arrow path, instead of booting a dedicated Kibana instance.
  dynamicConfig: {
    esql: { responseFormat: true },
  },
};

const pluginModule = new ContainerModule((options) => {
  bindOnSetup(options);
  bindArtifactTypes(options);
  bindAgentBuilder(options);
  bindOnStart(options);
  bindContract(options);
  bindRoutes(options);
  bindServices(options);
  bindEvents(options);
  bindRuleExecutionServices(options);
  bindDispatcherExecutionServices(options);
  bindTasks(options);
});

export { pluginModule as module };

export type { PluginConfig as AlertingV2Config } from './config';
export type {
  AlertingServerSetup,
  AlertingServerStart,
  RulesClientApi,
  ActionPolicyClientApi,
} from './types';
export type { ArtifactTypeDefinition, ArtifactReferenceDescriptor } from './lib/artifact_types';
export type { FindRulesArgs } from './lib/rules_client';
export type { FindActionPoliciesArgs } from './lib/action_policy_client';

/**
 * Public catalog of machine-readable error codes emitted by alerting v2 HTTP
 * routes and bulk-response `errors[i].error.code`. Consumers filter or branch
 * on these codes; renaming or removing an entry is a breaking wire-contract
 * change (see the catalog file for details).
 */
export { ALERTING_ERROR_CODES } from './lib/errors/error_codes';
export type { AlertingV2ErrorCode } from './lib/errors/error_codes';
