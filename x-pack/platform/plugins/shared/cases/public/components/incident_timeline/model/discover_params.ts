/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { IncidentTimelineAlert } from '../../../../common/types/api';
import { alertTimeMs } from './alert_rows';

const DISCOVER_PAD_RATIO = 0.05;
const DISCOVER_MIN_PAD_MS = 60 * 1000;

const ALERT_ORIGINAL_TIME = 'kibana.alert.original_time';

/** The subset of the Discover app locator params the panel sets. */
export interface IncidentTimelineDiscoverParams extends SerializableRecord {
  dataViewSpec: { title: string; timeFieldName: string; name: string };
  query: { language: 'kuery'; query: string };
  timeRange: { from: string; to: string };
  columns: string[];
  sort: string[][];
}

/**
 * Discover params for every alert of the case: an ad-hoc data view over the alert indices,
 * `case_ids` as the query, and a range on `@timestamp` that covers each alert's time.
 */
export const buildDiscoverParams = ({
  caseId,
  caseTitle,
  alerts,
  dataViewName,
}: {
  caseId: string;
  caseTitle: string;
  alerts: readonly IncidentTimelineAlert[];
  dataViewName: (caseTitle: string) => string;
}): IncidentTimelineDiscoverParams | undefined => {
  if (alerts.length === 0) return undefined;

  const startMs = Math.min(...alerts.map(alertTimeMs));
  const endMs = Math.max(...alerts.map(({ timestamp }) => Date.parse(timestamp)));
  const pad = Math.max((endMs - startMs) * DISCOVER_PAD_RATIO, DISCOVER_MIN_PAD_MS);
  const indices = Array.from(new Set(alerts.map(({ index }) => index))).sort();

  return {
    dataViewSpec: {
      title: indices.join(','),
      timeFieldName: '@timestamp',
      name: dataViewName(caseTitle),
    },
    query: { language: 'kuery', query: `kibana.alert.case_ids: "${caseId}"` },
    timeRange: {
      from: new Date(startMs - pad).toISOString(),
      to: new Date(endMs + pad).toISOString(),
    },
    columns: [
      ALERT_ORIGINAL_TIME,
      'kibana.alert.rule.name',
      'host.name',
      'user.name',
      'kibana.alert.workflow_status',
    ],
    sort: [[ALERT_ORIGINAL_TIME, 'asc']],
  };
};
