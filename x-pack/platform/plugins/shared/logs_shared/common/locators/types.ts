/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { LogViewReference } from '../log_views/types';
import { TimeRange } from './time_range';

export interface LogsLocatorParams extends SerializableRecord {
  /** Defines log position */
  time?: number;
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;
  filter?: string;
  logView?: LogViewReference;
}

export interface TraceLogsLocatorParams extends LogsLocatorParams {
  traceId: string;
}

export interface NodeLogsLocatorParams extends LogsLocatorParams {
  nodeField: string;
  nodeId: string;
}

export interface LogsSharedLocators {
  logsLocator: LocatorPublic<LogsLocatorParams>;
  nodeLogsLocator: LocatorPublic<NodeLogsLocatorParams>;
  traceLogsLocator: LocatorPublic<TraceLogsLocatorParams>;
}
