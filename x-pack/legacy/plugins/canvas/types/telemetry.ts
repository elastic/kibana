/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { Legacy } from 'kibana';

/**
  Function for collecting information about canvas usage
 */
export type TelemetryCollector = (
  /** The server instance */
  server: Legacy.Server,
  /** Function for calling elasticsearch */
  callCluster: CallCluster
) => Record<string, any>;

export interface TelemetryCustomElementDocument {
  content: string;
}

export interface TelemetryCustomElement {
  selectedNodes: Array<{
    expression: string;
  }>;
}
