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
import type { ContentClient } from '../lib/content/content_client';
import type { SignificantEventsClient } from '../lib/streams/significant_events/significant_events_client';
import type { AttachmentClient } from '../lib/streams/attachments/attachment_client';
import type { SignificantEventsService } from '../lib/streams/significant_events/significant_events_service';
import type { StreamsClient } from '../lib/streams/client';
import type { EbtTelemetryClient } from '../lib/telemetry';
import type { StreamsServer } from '../types';
import type { FeatureClient } from '../lib/streams/feature/feature_client';
import type { ProcessorSuggestionsService } from '../lib/streams/ingest_pipelines/processor_suggestions_service';

type GetScopedClients = ({
  request,
}: {
  request: KibanaRequest;
}) => Promise<RouteHandlerScopedClients>;

export interface RouteHandlerScopedClients {
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  significantEventsClient: SignificantEventsClient;
  attachmentClient: AttachmentClient;
  streamsClient: StreamsClient;
  featureClient: FeatureClient;
  inferenceClient: InferenceClient;
  contentClient: ContentClient;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
}

export interface RouteDependencies {
  significantEvents: SignificantEventsService;
  server: StreamsServer;
  telemetry: EbtTelemetryClient;
  getScopedClients: GetScopedClients;
  processorSuggestions: ProcessorSuggestionsService;
}

export type StreamsRouteHandlerResources = RouteDependencies & DefaultRouteHandlerResources;
