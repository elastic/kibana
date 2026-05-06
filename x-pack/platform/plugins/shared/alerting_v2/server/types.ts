/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import type { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { IEventLogService } from '@kbn/event-log-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { AgentContextLayerPluginSetup } from '@kbn/agent-context-layer-plugin/server';
import type { RulesClient } from './lib/rules_client';

export type RulesClientApi = PublicMethodsOf<RulesClient>;

export type AlertingServerSetup = void;

export interface AlertingServerStart {
  getRulesClientWithRequest(request: KibanaRequest): Promise<RulesClientApi>;
}

export interface AlertingServerSetupDependencies {
  taskManager: TaskManagerSetupContract;
  features: FeaturesPluginSetup;
  spaces: SpacesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  eventLog: IEventLogService;
  usageCollection?: UsageCollectionSetup;
  agentBuilder?: AgentBuilderPluginSetup;
  agentContextLayer?: AgentContextLayerPluginSetup;
}

export interface AlertingServerStartDependencies {
  taskManager: TaskManagerStartContract;
  features: FeaturesPluginStart;
  spaces: SpacesPluginStart;
  data: DataPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}
