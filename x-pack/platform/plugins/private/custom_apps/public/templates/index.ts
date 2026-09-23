/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { A2uiMessage, ComponentDefinition, JsonValue } from '@kbn/a2ui-renderer';
import type { CustomAppDefinition } from '../../common/app_definition';
import { SAMPLE_DATA_INDEX } from '../../common/constants';

export interface CustomAppTemplate {
  id: string;
  name: string;
  description: string;
  build: () => CustomAppDefinition;
}

const CATALOG_ID = 'elastic/kibana-eui/v1';
const FROM = `FROM ${SAMPLE_DATA_INDEX}`;

const surface = (
  surfaceId: string,
  components: ComponentDefinition[],
  dataModel: Record<string, JsonValue> = {}
): A2uiMessage[] => [
  { version: 'v1.0', createSurface: { surfaceId, catalogId: CATALOG_ID, dataModel, components } },
];

/**
 * The title, description and time picker are panels rather than page chrome, so
 * everything a reader sees can be edited the same way. The top bar carries only
 * actions that operate on the app itself.
 */
const webTraffic = (): CustomAppDefinition => ({
  version: 1,
  title: 'Web traffic',
  description: 'An in-depth view of the sample web logs, built entirely from ES|QL.',
  layout: {
    header: { type: 'panel', id: 'header', row: 0, column: 0, width: 34, height: 5 },
    filters: { type: 'panel', id: 'filters', row: 0, column: 34, width: 14, height: 5 },
    kpis: { type: 'panel', id: 'kpis', row: 5, column: 0, width: 48, height: 6 },
    overTime: { type: 'panel', id: 'overTime', row: 11, column: 0, width: 32, height: 16 },
    status: { type: 'panel', id: 'status', row: 11, column: 32, width: 16, height: 16 },
    topPages: { type: 'panel', id: 'topPages', row: 27, column: 0, width: 28, height: 16 },
    countries: { type: 'panel', id: 'countries', row: 27, column: 28, width: 20, height: 16 },
    fileTypes: { type: 'panel', id: 'fileTypes', row: 43, column: 0, width: 24, height: 15 },
    platforms: { type: 'panel', id: 'platforms', row: 43, column: 24, width: 24, height: 15 },
    errors: { type: 'panel', id: 'errors', row: 58, column: 0, width: 48, height: 15 },
  },
  panels: {
    header: {},
    filters: {},
    kpis: { title: 'At a glance' },
    overTime: { title: 'Requests over time' },
    status: { title: 'Response codes' },
    topPages: { title: 'Busiest pages' },
    countries: { title: 'Destinations' },
    fileTypes: { title: 'Bandwidth by file type' },
    platforms: { title: 'Client platforms' },
    errors: { title: 'Pages returning errors' },
  },
  queries: {
    kpis: [
      {
        path: '/totals',
        shape: 'first',
        query: `${FROM} | STATS requests = COUNT(*), visitors = COUNT_DISTINCT(clientip), bytes = SUM(bytes), errors = COUNT(CASE(response.keyword != "200", 1, null)) | EVAL error_rate = ROUND(100.0 * errors / requests, 1)`,
      },
    ],
    overTime: [
      {
        path: '/series',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY time = BUCKET(@timestamp, 1 day), status = response.keyword | SORT time | LIMIT 500`,
      },
    ],
    status: [
      {
        path: '/codes',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY status = response.keyword | SORT requests DESC | LIMIT 6`,
      },
    ],
    topPages: [
      {
        path: '/pages',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*), avg_bytes = ROUND(AVG(bytes)) BY page = url.keyword | SORT requests DESC | LIMIT 10`,
      },
    ],
    countries: [
      {
        path: '/countries',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY country = geo.dest | SORT requests DESC | LIMIT 8`,
      },
    ],
    fileTypes: [
      {
        path: '/types',
        shape: 'rows',
        query: `${FROM} | WHERE extension.keyword != "" | STATS bytes = SUM(bytes) BY type = extension.keyword | SORT bytes DESC | LIMIT 6`,
      },
    ],
    platforms: [
      {
        path: '/platforms',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY os = machine.os.keyword | SORT requests DESC | LIMIT 6`,
      },
    ],
    errors: [
      {
        path: '/errors',
        shape: 'rows',
        query: `${FROM} | WHERE response.keyword != "200" | STATS errors = COUNT(*) BY page = url.keyword, status = response.keyword | SORT errors DESC | LIMIT 12`,
      },
    ],
  },
  surfaces: {
    header: surface('header', [
      { id: 'root', component: 'Column', children: ['title', 'subtitle'], gap: 'xs' },
      { id: 'title', component: 'Text', text: 'Web traffic', variant: 'heading1' },
      {
        id: 'subtitle',
        component: 'Text',
        text: 'Sample web logs, every panel driven by an **ES|QL** query. Edit this panel to change the title.',
        color: 'subdued',
      },
    ]),
    filters: surface('filters', [
      { id: 'root', component: 'Column', children: ['label', 'picker'], gap: 'xs' },
      { id: 'label', component: 'Text', text: 'Time range', variant: 'caption', color: 'subdued' },
      { id: 'picker', component: 'KbnTimeFilter', showUpdateButton: false, fullWidth: true },
    ]),
    kpis: surface('kpis', [
      { id: 'root', component: 'Row', children: ['req', 'vis', 'bytes', 'errs'], gap: 'l' },
      {
        id: 'req',
        component: 'Stat',
        title: { call: 'formatNumber', args: { value: { path: '/totals/requests' } } },
        description: 'Requests',
        color: 'primary',
      },
      {
        id: 'vis',
        component: 'Stat',
        title: { call: 'formatNumber', args: { value: { path: '/totals/visitors' } } },
        description: 'Unique visitors',
        color: 'accent',
      },
      {
        id: 'bytes',
        component: 'Stat',
        title: { call: 'formatNumber', args: { value: { path: '/totals/bytes' } } },
        description: 'Bytes served',
        color: 'default',
      },
      {
        id: 'errs',
        component: 'Stat',
        title: {
          call: 'concat',
          args: { values: [{ path: '/totals/error_rate' }, '%'], separator: '' },
        },
        description: 'Non-200 responses',
        color: 'danger',
      },
    ]),
    overTime: surface('overTime', [
      {
        id: 'root',
        component: 'Chart',
        chartType: 'bar',
        rows: { path: '/series' },
        x: 'time',
        y: 'requests',
        breakdown: 'status',
        xTitle: 'Time',
        yTitle: 'Requests',
      },
    ]),
    status: surface('status', [
      {
        id: 'root',
        component: 'Chart',
        chartType: 'bar',
        rows: { path: '/codes' },
        x: 'status',
        y: 'requests',
        xTitle: 'Status',
        yTitle: 'Requests',
      },
    ]),
    topPages: surface('topPages', [
      {
        id: 'root',
        component: 'Table',
        caption: 'Pages by request volume',
        rows: { path: '/pages' },
        compressed: true,
        columns: [
          { field: 'page', name: 'Page' },
          { field: 'requests', name: 'Requests', align: 'right' },
          { field: 'avg_bytes', name: 'Avg bytes', align: 'right' },
        ],
      },
    ]),
    countries: surface('countries', [
      {
        id: 'root',
        component: 'Chart',
        chartType: 'bar',
        rows: { path: '/countries' },
        x: 'country',
        y: 'requests',
        xTitle: 'Country',
        yTitle: 'Requests',
      },
    ]),
    fileTypes: surface('fileTypes', [
      {
        id: 'root',
        component: 'Chart',
        chartType: 'bar',
        rows: { path: '/types' },
        x: 'type',
        y: 'bytes',
        xTitle: 'File type',
        yTitle: 'Bytes',
      },
    ]),
    platforms: surface('platforms', [
      {
        id: 'root',
        component: 'Chart',
        chartType: 'bar',
        rows: { path: '/platforms' },
        x: 'os',
        y: 'requests',
        xTitle: 'Operating system',
        yTitle: 'Requests',
      },
    ]),
    errors: surface('errors', [
      {
        id: 'root',
        component: 'Table',
        caption: 'Pages returning non-200 responses, by status code',
        rows: { path: '/errors' },
        compressed: true,
        columns: [
          { field: 'page', name: 'Page' },
          { field: 'status', name: 'Status' },
          { field: 'errors', name: 'Errors', align: 'right' },
        ],
      },
    ]),
  },
});

export const CUSTOM_APP_TEMPLATES: CustomAppTemplate[] = [
  {
    id: 'web-traffic',
    name: 'Web traffic',
    description:
      'Ten panels over the sample web logs: KPI tiles, time series, breakdowns and tables — all ES|QL.',
    build: webTraffic,
  },
];
