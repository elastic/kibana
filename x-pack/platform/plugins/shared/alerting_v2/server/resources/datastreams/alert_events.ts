/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { ALERT_EVENTS_MAPPINGS } from '@kbn/alerting-v2-schemas';
import type { AlertEventDocument } from '@kbn/alerting-v2-schemas';
import { getIngestTimestampPipeline } from './ingest_timestamp_pipeline';
import type { ResourceDefinition } from './types';

export const ALERT_EVENTS_DATA_STREAM_VERSION = 8;
export const ALERT_EVENTS_BACKING_INDEX = '.ds-.rule-events-*';
export const ALERT_EVENTS_RESOURCE_KEY = `data_stream:${ALERT_EVENTS_DATA_STREAM}`;

// Re-exported so existing alerting_v2 imports keep working; the definitions live in the schemas package.
export {
  alertEventSchema,
  alertEventStatus,
  alertEventType,
  alertEpisodeStatus,
} from '@kbn/alerting-v2-schemas';
export type {
  AlertEvent,
  AlertEventDocument,
  AlertEventStatus,
  AlertEventType,
  AlertEpisodeStatus,
} from '@kbn/alerting-v2-schemas';

export const buildRuleEventDocument = (params: AlertEventDocument): AlertEventDocument => {
  const { scheduled_timestamp, alert, severity, ...required } = params;

  const doc: AlertEventDocument = { ...required };

  if (scheduled_timestamp !== undefined) {
    doc.scheduled_timestamp = scheduled_timestamp;
  }

  if (alert !== undefined) {
    doc.alert = {
      id: alert.id,
      status: alert.status,
      ...(alert.status_count != null ? { status_count: alert.status_count } : {}),
    };
  }

  if (severity !== undefined) {
    doc.severity = severity;
  }

  return doc;
};

export const getAlertEventsResourceDefinition = ({
  dataRetention,
}: { dataRetention?: string } = {}): ResourceDefinition => ({
  key: ALERT_EVENTS_RESOURCE_KEY,
  dataStreamName: ALERT_EVENTS_DATA_STREAM,
  version: ALERT_EVENTS_DATA_STREAM_VERSION,
  mappings: ALERT_EVENTS_MAPPINGS,
  lifecycle: dataRetention ? { data_retention: dataRetention } : {},
  manageLifecycle: true,
  finalPipeline: getIngestTimestampPipeline(ALERT_EVENTS_DATA_STREAM),
});
