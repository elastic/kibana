/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SourcesClient } from './lib/sources_client';

export type GetSourcesClient = (params: { request: KibanaRequest }) => Promise<SourcesClient>;

export type NightshiftSourcesServerSetup = void;

export interface NightshiftSourcesServerStart {
  getSourcesClient: GetSourcesClient;
}
