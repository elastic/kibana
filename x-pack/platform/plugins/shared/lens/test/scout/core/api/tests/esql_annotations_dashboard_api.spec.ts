/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest } from '../fixtures';

// The visualizations library API only accepts DSL charts, so ES|QL charts are exercised
// through by-value dashboard panels.
const DASHBOARDS_API_PATH = '/api/dashboards';
const HEADERS = { 'kbn-xsrf': 'scout', 'elastic-api-version': '2023-10-31' } as const;

const ESQL_DATA_LAYER = {
  type: 'bar',
  data_source: {
    type: 'esql',
    query: 'FROM logstash-* | STATS count = COUNT(*) BY buckets = BUCKET(@timestamp, 3 hours)',
  },
  ignore_global_filters: false,
  sampling: 1,
  x: { column: 'buckets' },
  y: [{ column: 'count' }],
};

const DSL_DATA_LAYER = {
  type: 'bar',
  data_source: { type: 'data_view_reference', ref_id: 'logstash-*' },
  ignore_global_filters: false,
  sampling: 1,
  x: { operation: 'date_histogram', field: '@timestamp' },
  y: [{ operation: 'count' }],
};

const ESQL_POINT_EVENT = {
  type: 'esql',
  data_source: {
    type: 'esql',
    query: 'FROM logstash-* | WHERE geo.src == "CN" | KEEP @timestamp, geo.dest, geo.src',
  },
  time_column: '@timestamp',
  time_field: '@timestamp',
  label: 'Requests from CN',
  text: { visible: true, column: 'geo.dest' },
  extra_columns: ['geo.src'],
  icon: 'flag',
  line: { stroke_width: 2, stroke_dash: 'dashed' },
  color: { type: 'static', color: '#e5281e' },
};

const ESQL_RANGE_EVENT = {
  type: 'esql',
  data_source: {
    type: 'esql',
    query:
      'FROM logstash-* | EVAL end = @timestamp + 30 minutes | KEEP @timestamp, end, geo.src | LIMIT 5',
  },
  time_column: '@timestamp',
  end_time_column: 'end',
  label: 'Windows',
  text: { column: 'geo.src' },
  fill: 'outside',
};

const dashboardWithXyPanel = (dataLayer: object, events: object[]) => ({
  title: `ES|QL annotations - ${Date.now()} - ${Math.random()}`,
  panels: [
    {
      grid: { x: 0, y: 0, w: 24, h: 15 },
      type: 'vis',
      config: {
        type: 'xy',
        layers: [dataLayer, { type: 'annotations', ignore_global_filters: true, events }],
      },
    },
  ],
});

apiTest.describe('ES|QL annotations in dashboard panels', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('creates and reads back ES|QL point and range annotations', async ({ apiClient }) => {
    const headers = { ...HEADERS, ...editorCredentials.apiKeyHeader };
    const created = await apiClient.post(DASHBOARDS_API_PATH, {
      headers,
      body: dashboardWithXyPanel(ESQL_DATA_LAYER, [ESQL_POINT_EVENT, ESQL_RANGE_EVENT]),
      responseType: 'json',
    });
    expect(created).toHaveStatusCode(201);

    const response = await apiClient.get(`${DASHBOARDS_API_PATH}/${created.body.id}`, {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    const [panel] = response.body.data.panels;
    const annotationLayer = panel.config.layers.find(
      ({ type }: { type: string }) => type === 'annotations'
    );
    expect(annotationLayer.events).toStrictEqual([
      expect.objectContaining(ESQL_POINT_EVENT),
      expect.objectContaining(ESQL_RANGE_EVENT),
    ]);
  });

  apiTest('rejects ES|QL annotations on charts with data view layers', async ({ apiClient }) => {
    const headers = { ...HEADERS, ...editorCredentials.apiKeyHeader };
    const createWithEvent = (event: object) =>
      apiClient.post(DASHBOARDS_API_PATH, {
        headers,
        body: dashboardWithXyPanel(DSL_DATA_LAYER, [event]),
        responseType: 'json',
      });

    // the same chart is valid with a manual annotation, so the rejection is about the event
    const manual = await createWithEvent({ type: 'point', timestamp: '2015-09-21T12:00:00.000Z' });
    expect(manual).toHaveStatusCode(201);
    const esql = await createWithEvent(ESQL_POINT_EVENT);
    expect(esql).toHaveStatusCode(400);
  });

  apiTest('rejects point-only styling on ES|QL range annotations', async ({ apiClient }) => {
    const headers = { ...HEADERS, ...editorCredentials.apiKeyHeader };
    const createWithEvent = (event: object) =>
      apiClient.post(DASHBOARDS_API_PATH, {
        headers,
        body: dashboardWithXyPanel(ESQL_DATA_LAYER, [event]),
        responseType: 'json',
      });

    expect(await createWithEvent(ESQL_RANGE_EVENT)).toHaveStatusCode(201);
    expect(await createWithEvent({ ...ESQL_RANGE_EVENT, icon: 'flag' })).toHaveStatusCode(400);
  });
});
