/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public';
import type { StreamsTelemetryClient } from '../telemetry/client';

export interface StreamsAppServices {
  dataStreamsClient: Promise<IDataStreamsStatsClient>;
  telemetryClient: StreamsTelemetryClient;
  version: string;
}
