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
  /**
   * Same client the HTTP routes use. Does not re-check `read_nightshift` / `manage_nightshift`;
   * the hidden type excludes the saved-objects security extension, so the caller must already
   * be authorized (a Nightshift-privileged route, not a weaker handler).
   */
  getSourcesClient: GetSourcesClient;
}
