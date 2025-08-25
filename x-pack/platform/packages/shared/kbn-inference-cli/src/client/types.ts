/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { InferenceConnector } from '@kbn/inference-common';
import type { KibanaClient } from '@kbn/kibana-api-cli';

export interface InferenceCliClientOptions {
  log: ToolingLog;
  kibanaClient: KibanaClient;
  connector: InferenceConnector;
  signal: AbortSignal;
}
