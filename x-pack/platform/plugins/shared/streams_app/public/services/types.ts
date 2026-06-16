/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public';
import type { StreamsTelemetryClient } from '../telemetry/client';
import type { FocusedSignificantEventService } from './significant_events/focused_significant_event_service';

export interface StreamsAppServices {
  dataStreamsClient: Promise<IDataStreamsStatsClient>;
  focusedSignificantEventService: FocusedSignificantEventService;
  telemetryClient: StreamsTelemetryClient;
  version: string;
}
