/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

const LOGS = 'kibana_sample_data_logs';

/** Data view the logs sample data set installs. */
export const SAMPLE_LOGS_DATA_VIEW_ID = '90943e30-9a47-11e8-b64d-95841ca0b247';

/** Anomaly detection job of the logs sample data ML module. */
const LOW_REQUEST_RATE_JOB_ID = 'low_request_rate';

/**
 * A Lens bar chart over the sample logs data view instead of ES|QL. The
 * dashboard agent cannot edit it, so an edit or enhance must keep it as it is.
 */
export const dataViewBarPanel = (id: string, grid: AttachmentPanel['grid']): AttachmentPanel => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  grid,
  config: {
    type: 'xy',
    title: 'Requests by file extension',
    layers: [
      {
        type: 'bar',
        data_source: { type: 'data_view_reference', ref_id: SAMPLE_LOGS_DATA_VIEW_ID },
        x: { operation: 'terms', fields: ['extension.keyword'], limit: 10 },
        y: [{ operation: 'count' }],
      },
    ],
    axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
    legend: { position: 'bottom', visibility: 'visible' },
  },
});

const requestsByOsSpec = (
  data: Record<string, unknown>,
  encoding: { os: string; requests: string }
): string =>
  JSON.stringify(
    {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data,
      mark: 'bar',
      encoding: {
        y: { field: encoding.os, type: 'nominal', sort: '-x', title: null },
        x: { field: encoding.requests, type: 'quantitative', title: null },
      },
    },
    null,
    2
  );

const ESQL_REQUESTS_BY_OS_SPEC = requestsByOsSpec(
  {
    url: {
      '%type%': 'esql',
      query: `FROM ${LOGS}
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Requests\` = COUNT(*) BY machine.os.keyword
| SORT \`Requests\` DESC
| LIMIT 10`,
    },
  },
  // Vega-Lite reads a dot in a field name as a nested path, so the flat ES|QL column escapes it.
  { os: 'machine\\.os\\.keyword', requests: 'Requests' }
);

const DSL_REQUESTS_BY_OS_SPEC = requestsByOsSpec(
  {
    url: {
      index: LOGS,
      '%context%': true,
      '%timefield%': '@timestamp',
      body: { size: 0, aggs: { os: { terms: { field: 'machine.os.keyword', size: 10 } } } },
    },
    format: { property: 'aggregations.os.buckets' },
  },
  { os: 'key', requests: 'doc_count' }
);

/** A Vega-Lite bar chart over ES|QL, a panel kind the agent edits by spec rather than Lens config. */
export const vegaPanel = (id: string, grid: AttachmentPanel['grid']): AttachmentPanel => ({
  type: 'vega',
  id,
  grid,
  config: { title: 'Requests by OS (Vega)', spec: ESQL_REQUESTS_BY_OS_SPEC },
});

/**
 * The same Vega-Lite bar chart over an Elasticsearch query instead of ES|QL.
 * The dashboard agent cannot edit it, so an edit must keep it and offer an
 * ES|QL replacement.
 */
export const dslVegaPanel = (id: string, grid: AttachmentPanel['grid']): AttachmentPanel => ({
  ...vegaPanel(id, grid),
  config: { title: 'Requests by OS (Vega)', spec: DSL_REQUESTS_BY_OS_SPEC },
});

/** An ML anomaly swim lane, a config-only panel kind with no query of its own. */
export const mlSwimlanePanel = (id: string, grid: AttachmentPanel['grid']): AttachmentPanel => ({
  type: 'ml_anomaly_swimlane',
  id,
  grid,
  config: {
    title: 'Request rate anomalies',
    job_ids: [LOW_REQUEST_RATE_JOB_ID],
    swimlane_type: 'overall',
  },
});

const esqlControlConfig = (field: string, title: string) => ({
  title,
  values_source: 'esql',
  esql_query: `FROM ${LOGS} | STATS BY ${field}`,
});

/** An options list, a range slider and a time slider, stored as the dashboard agent stores them. */
export const SAMPLE_LOGS_CONTROLS: NonNullable<DashboardAttachmentData['pinned_panels']> = [
  {
    type: 'options_list_control',
    id: 'machine.os.keyword-options_list',
    width: 'medium',
    grow: true,
    config: esqlControlConfig('machine.os.keyword', 'Operating system'),
  },
  {
    type: 'range_slider_control',
    id: 'bytes-range_slider',
    width: 'medium',
    grow: true,
    config: esqlControlConfig('bytes', 'Bytes'),
  },
  {
    type: 'time_slider_control',
    id: 'time_slider',
    width: 'large',
    grow: true,
    config: {
      start_percentage_of_time_range: 0,
      end_percentage_of_time_range: 1,
      is_anchored: false,
    },
  },
];
