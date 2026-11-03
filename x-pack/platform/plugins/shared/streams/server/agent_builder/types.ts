/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RouteHandlerScopedClients } from '../routes/types';

/**
 * What the Streams agent builder tools use of the scoped clients. Kibana builds all of
 * `RouteHandlerScopedClients`, a task pod builds only these.
 */
export type AgentBuilderScopedClients = Pick<
  RouteHandlerScopedClients,
  | 'scopedClusterClient'
  | 'streamsClient'
  | 'attachmentClient'
  | 'uiSettingsClient'
  | 'fieldsMetadataClient'
>;

export type GetAgentBuilderScopedClients = (params: {
  request: KibanaRequest;
}) => Promise<AgentBuilderScopedClients>;
