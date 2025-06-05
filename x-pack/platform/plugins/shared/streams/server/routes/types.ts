/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { InferenceClient } from '@kbn/inference-plugin/server';
import { StreamsServer } from '../types';
import { AssetService } from '../lib/streams/assets/asset_service';
import { AssetClient } from '../lib/streams/assets/asset_client';
import { StreamsClient } from '../lib/streams/client';
import { StreamsTelemetryClient } from '../lib/telemetry/client';
import { ContentClient } from '../lib/content/content_client';
import { QueryClient } from '../lib/streams/assets/query/query_client';

type GetScopedClients = ({
  request,
}: {
  request: KibanaRequest;
}) => Promise<RouteHandlerScopedClients>;

export interface RouteHandlerScopedClients {
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
  inferenceClient: InferenceClient;
  contentClient: ContentClient;
  queryClient: QueryClient;
}

export interface RouteDependencies {
  assets: AssetService;
  server: StreamsServer;
  telemetry: StreamsTelemetryClient;
  getScopedClients: GetScopedClients;
}

export type StreamsRouteHandlerResources = RouteDependencies & DefaultRouteHandlerResources;
