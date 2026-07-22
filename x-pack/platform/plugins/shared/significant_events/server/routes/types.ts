/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceClient } from '@kbn/inference-common';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { SignificantEventsTuningConfig } from '@kbn/significant-events-schema';
import type { StreamsClient } from '@kbn/streams-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { RulesClientCreateOptions } from '@kbn/alerting-plugin/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { AttachmentClient } from '@kbn/streams-plugin/server';
import type { SignificantEventsAlertingContext } from '../lib/significant_events/alerting/significant_events_alerting_context';
import type { EbtTelemetryClient } from '../lib/telemetry';
import type { KnowledgeIndicatorClient } from '../lib/knowledge_indicators';
import type { SignificantEventsClients } from '../lib/significant_events/significant_events_clients';
import type { ContinuousKiOnboardingWorkflowService } from '../lib/workflows/continuous_onboarding_workflow';
import type { SignificantEventsScheduledWorkflowsService } from '../lib/workflows/significant_events_scheduled_workflows';
import type { WorkflowClients } from '../lib/workflows/create_workflow_clients';

export type GetScopedClients = (params: {
  request: KibanaRequest;
  rulesClientOptions?: RulesClientCreateOptions;
}) => Promise<RouteHandlerScopedClients>;

export interface RouteHandlerScopedClients extends SignificantEventsClients {
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  attachmentClient: AttachmentClient;
  getSignificantEventsAlertingContext: () => Promise<SignificantEventsAlertingContext>;
  getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient>;
  deleteLegacyRules: (ruleIds: string[]) => Promise<void>;
  inferenceClient: InferenceClient;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
  globalUiSettingsClient: IUiSettingsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  streamsClient: StreamsClient;
  isSecurityEnabled: boolean;
  tuningConfig: SignificantEventsTuningConfig;
}

export interface RouteDependencies {
  server: StreamsServer;
  telemetry: EbtTelemetryClient;
  getScopedClients: GetScopedClients;
  continuousKiOnboardingWorkflowService?: ContinuousKiOnboardingWorkflowService;
  significantEventsScheduledWorkflowsService?: SignificantEventsScheduledWorkflowsService;
  workflowClients: WorkflowClients;
  getSpaceId: (request: KibanaRequest) => Promise<string>;
}

export type SignificantEventsRouteHandlerResources = RouteDependencies &
  DefaultRouteHandlerResources;
