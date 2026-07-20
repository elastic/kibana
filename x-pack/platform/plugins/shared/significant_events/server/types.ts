/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsPluginSetup, StreamsPluginStart } from '@kbn/streams-plugin/server';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgentBuilderSmlPluginSetup,
  AgentBuilderSmlPluginStart,
} from '@kbn/agent-builder-sml-plugin/server';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type {
  FieldsMetadataServerSetup,
  FieldsMetadataServerStart,
} from '@kbn/fields-metadata-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ConsoleStart as ConsoleServerStart } from '@kbn/console-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';

export interface SignificantEventsPluginSetupDependencies {
  agentBuilder?: AgentBuilderPluginSetup;
  agentBuilderSml?: AgentBuilderSmlPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
  alerting: AlertingServerSetup;
  /** Setup only requires plugin presence; Alerting v2 exposes its usable contract at start. */
  alertingVTwo: void;
  features: FeaturesPluginSetup;
  usageCollection: UsageCollectionSetup;
  fieldsMetadata: FieldsMetadataServerSetup;
  cloud?: CloudSetup;
  globalSearch?: GlobalSearchPluginSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
  streams: StreamsPluginSetup;
}

export interface SignificantEventsPluginStartDependencies {
  actions: ActionsPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
  taskManager: TaskManagerStartContract;
  alerting: AlertingServerStart;
  alertingVTwo: AlertingV2ServerStart;
  inference: InferenceServerStart;
  fieldsMetadata: FieldsMetadataServerStart;
  console: ConsoleServerStart;
  agentBuilder?: AgentBuilderPluginStart;
  agentBuilderSml?: AgentBuilderSmlPluginStart;
  spaces?: SpacesPluginStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  streams: StreamsPluginStart;
}
