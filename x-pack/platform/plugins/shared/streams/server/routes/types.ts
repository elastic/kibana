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
import type { IUiSettingsClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
// Minimal fleet interfaces — avoids importing @kbn/fleet-plugin/server which pulls in
// packages outside this plugin's rootDir via its transitive dependency chain.
export interface FleetAgentClient {
  listAgents(options: {
    showAgentless?: boolean;
    showInactive?: boolean;
    perPage?: number;
  }): Promise<{
    agents: Array<{
      id: string;
      status: string;
      policy_id?: string;
      local_metadata?: { host?: { hostname?: string } };
      agent?: { version?: string };
    }>;
    total: number;
  }>;
}

export interface FleetAgentPolicyService {
  list(
    soClient: SavedObjectsClientContract,
    options?: { kuery?: string; perPage?: number }
  ): Promise<{
    items: Array<{
      id: string;
      name: string;
      supports_agentless?: boolean | null;
      package_policies?: string[];
    }>;
  }>;
}
import type { ContentClient } from '../lib/content/content_client';
import type { AttachmentClient } from '../lib/streams/attachments/attachment_client';
import type { QueryClient } from '../lib/streams/assets/query/query_client';
import type { StreamsClient } from '../lib/streams/client';
import type { EbtTelemetryClient } from '../lib/telemetry';
import type { StreamsServer } from '../types';
import type { FeatureClient } from '../lib/streams/feature/feature_client';
import type { ProcessorSuggestionsService } from '../lib/streams/ingest_pipelines/processor_suggestions_service';
import type { IPatternExtractionService } from '../lib/pattern_extraction/pattern_extraction_service';
import type { TaskClient } from '../lib/tasks/task_client';
import type { StreamsTaskType } from '../lib/tasks/task_definitions';
import type { InsightClient } from '../lib/sig_events/insights/client/insight_client';
import type { StreamsSettingsStorageClient } from '../lib/streams/storage/streams_settings_storage_client';
import type { ContinuousKiExtractionWorkflowService } from '../lib/workflows/continuous_extraction_workflow';
import type { SigEventsTuningConfig } from '../../common/sig_events_tuning_config';
import type { CloudPipelinesMockClient } from '../lib/mock_ingest_sources/cloud_pipelines/client';
import type { PrometheusMockClient } from '../lib/mock_ingest_sources/prometheus/client';

export type GetScopedClients = ({
  request,
}: {
  request: KibanaRequest;
}) => Promise<RouteHandlerScopedClients>;

export interface RouteHandlerScopedClients {
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  attachmentClient: AttachmentClient;
  streamsClient: StreamsClient;
  getFeatureClient: () => Promise<FeatureClient>;
  insightClient: InsightClient;
  inferenceClient: InferenceClient;
  contentClient: ContentClient;
  getQueryClient: () => Promise<QueryClient>;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
  globalUiSettingsClient: IUiSettingsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  taskClient: TaskClient<StreamsTaskType>;
  streamsSettingsStorageClient: StreamsSettingsStorageClient;
  isSecurityEnabled: boolean;
  tuningConfig: SigEventsTuningConfig;
  fleetAgentClient?: FleetAgentClient;
  fleetAgentPolicyService?: FleetAgentPolicyService;
  cloudPipelinesMock: CloudPipelinesMockClient;
  prometheusMock: PrometheusMockClient;
}

export interface RouteDependencies {
  server: StreamsServer;
  telemetry: EbtTelemetryClient;
  getScopedClients: GetScopedClients;
  processorSuggestions: ProcessorSuggestionsService;
  patternExtractionService: IPatternExtractionService;
  continuousKiExtractionWorkflowService?: ContinuousKiExtractionWorkflowService;
}

export type StreamsRouteHandlerResources = RouteDependencies & DefaultRouteHandlerResources;
