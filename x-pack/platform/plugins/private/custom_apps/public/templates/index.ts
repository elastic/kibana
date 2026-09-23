/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { A2uiMessage, ComponentDefinition, JsonValue } from '@kbn/a2ui-renderer';
import type { CustomAppDefinition } from '../../common/app_definition';
import { ACTION_RUN_WORKFLOW, SAMPLE_DATA_INDEX } from '../../common/constants';

export interface CustomAppTemplate {
  id: string;
  name: string;
  description: string;
  build: () => CustomAppDefinition;
}

const CATALOG_ID = 'elastic/kibana-eui/v1';

/** Every template reads the logs sample data set, so the queries share a source. */
const FROM = `FROM ${SAMPLE_DATA_INDEX}`;

const surface = (
  surfaceId: string,
  components: ComponentDefinition[],
  dataModel: Record<string, JsonValue> = {}
): A2uiMessage[] => [
  { version: 'v1.0', createSurface: { surfaceId, catalogId: CATALOG_ID, dataModel, components } },
];

const webTraffic = (): CustomAppDefinition => ({
  version: 1,
  title: 'Web traffic',
  description: 'Request volume, status mix and top pages, all from ES|QL over the sample logs.',
  layout: {
    kpis: { type: 'panel', id: 'kpis', row: 0, column: 0, width: 48, height: 7 },
    overTime: { type: 'panel', id: 'overTime', row: 7, column: 0, width: 30, height: 15 },
    status: { type: 'panel', id: 'status', row: 7, column: 30, width: 18, height: 15 },
    topPages: { type: 'panel', id: 'topPages', row: 22, column: 0, width: 48, height: 14 },
  },
  panels: {
    kpis: { title: 'Overview' },
    overTime: { title: 'Requests over time' },
    status: { title: 'Response codes' },
    topPages: { title: 'Busiest pages' },
  },
  queries: {
    kpis: [
      {
        path: '/totals',
        shape: 'first',
        query: `${FROM} | STATS requests = COUNT(*), bytes = SUM(bytes), errors = COUNT(CASE(response.keyword != "200", 1, null)) | EVAL error_rate = ROUND(100.0 * errors / requests, 1)`,
      },
    ],
    overTime: [
      {
        path: '/series',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY time = BUCKET(@timestamp, 1 day) | SORT time | LIMIT 200`,
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
        query: `${FROM} | STATS requests = COUNT(*), bytes = SUM(bytes) BY page = url.keyword | SORT requests DESC | LIMIT 10`,
      },
    ],
  },
  surfaces: {
    kpis: surface('kpis', [
      { id: 'root', component: 'Row', children: ['req', 'bytes', 'errs'], gap: 'l' },
      {
        id: 'req',
        component: 'Stat',
        title: { call: 'formatNumber', args: { value: { path: '/totals/requests' } } },
        description: 'Requests',
        color: 'primary',
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
        chartType: 'area',
        rows: { path: '/series' },
        x: 'time',
        y: 'requests',
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
        columns: [
          { field: 'page', name: 'Page' },
          { field: 'requests', name: 'Requests', align: 'right' },
          { field: 'bytes', name: 'Bytes', align: 'right' },
        ],
      },
    ]),
  },
});

const errorTriage = (): CustomAppDefinition => ({
  version: 1,
  title: 'Error triage',
  description: 'Where the non-200 responses are coming from, with a remediation form.',
  layout: {
    intro: { type: 'panel', id: 'intro', row: 0, column: 0, width: 48, height: 6 },
    byStatus: { type: 'panel', id: 'byStatus', row: 6, column: 0, width: 24, height: 15 },
    worstPages: { type: 'panel', id: 'worstPages', row: 6, column: 24, width: 24, height: 15 },
    remediate: { type: 'panel', id: 'remediate', row: 21, column: 0, width: 48, height: 16 },
  },
  panels: {
    intro: { title: 'Before you start' },
    byStatus: { title: 'Errors over time' },
    worstPages: { title: 'Pages with the most errors' },
    remediate: { title: 'Remediate' },
  },
  queries: {
    byStatus: [
      {
        path: '/series',
        shape: 'rows',
        query: `${FROM} | WHERE response.keyword != "200" | STATS errors = COUNT(*) BY time = BUCKET(@timestamp, 1 day), status = response.keyword | SORT time | LIMIT 300`,
      },
    ],
    worstPages: [
      {
        path: '/pages',
        shape: 'rows',
        query: `${FROM} | WHERE response.keyword != "200" | STATS errors = COUNT(*) BY page = url.keyword | SORT errors DESC | LIMIT 8`,
      },
    ],
    remediate: [
      {
        path: '/hosts',
        shape: 'rows',
        query: `${FROM} | WHERE response.keyword != "200" | STATS errors = COUNT(*) BY host = host.keyword | SORT errors DESC | LIMIT 5`,
      },
    ],
  },
  surfaces: {
    intro: surface('intro', [
      { id: 'root', component: 'Column', children: ['callout', 'body'], gap: 's' },
      {
        id: 'callout',
        component: 'Callout',
        title: 'These panels follow the time picker above',
        color: 'primary',
        iconType: 'clock',
      },
      {
        id: 'body',
        component: 'Text',
        text: 'Every panel here runs an **ES|QL** query against the sample web logs. Narrow the time range to see the charts and tables update together.',
      },
    ]),
    byStatus: surface('byStatus', [
      {
        id: 'root',
        component: 'Chart',
        chartType: 'bar',
        rows: { path: '/series' },
        x: 'time',
        y: 'errors',
        breakdown: 'status',
        xTitle: 'Time',
        yTitle: 'Errors',
      },
    ]),
    worstPages: surface('worstPages', [
      {
        id: 'root',
        component: 'Table',
        caption: 'Pages returning the most non-200 responses',
        rows: { path: '/pages' },
        columns: [
          { field: 'page', name: 'Page' },
          { field: 'errors', name: 'Errors', align: 'right' },
        ],
      },
    ]),
    remediate: surface(
      'remediate',
      [
        { id: 'root', component: 'Column', children: ['hint', 'hosts', 'note', 'go'], gap: 'm' },
        {
          id: 'hint',
          component: 'Text',
          text: 'Hosts are ranked by error count for the selected time range.',
          variant: 'caption',
          color: 'subdued',
        },
        {
          id: 'hosts',
          component: 'Table',
          caption: 'Hosts by error count',
          rows: { path: '/hosts' },
          compressed: true,
          columns: [
            { field: 'host', name: 'Host' },
            { field: 'errors', name: 'Errors', align: 'right' },
          ],
        },
        {
          id: 'note',
          component: 'TextField',
          label: 'What are you changing?',
          value: { path: '/form/note' },
          placeholder: 'e.g. roll back the 6.3.2 artifact',
        },
        {
          id: 'go',
          component: 'Button',
          label: 'Run remediation workflow',
          variant: 'primary',
          iconType: 'play',
          disabled: { call: 'isEmpty', args: { value: { path: '/form/note' } } },
          action: {
            event: {
              name: ACTION_RUN_WORKFLOW,
              context: { workflowId: 'remediate-errors', note: { path: '/form/note' } },
            },
          },
        },
      ],
      { form: { note: '' } }
    ),
  },
});

const blank = (): CustomAppDefinition => ({
  version: 1,
  title: 'Untitled app',
  description: 'A single panel with one ES|QL query to build from.',
  layout: {
    panel1: { type: 'panel', id: 'panel1', row: 0, column: 0, width: 30, height: 14 },
  },
  panels: { panel1: { title: 'Requests over time' } },
  queries: {
    panel1: [
      {
        path: '/series',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY time = BUCKET(@timestamp, 1 day) | SORT time | LIMIT 100`,
      },
    ],
  },
  surfaces: {
    panel1: surface('panel1', [
      {
        id: 'root',
        component: 'Chart',
        chartType: 'line',
        rows: { path: '/series' },
        x: 'time',
        y: 'requests',
      },
    ]),
  },
});

export const CUSTOM_APP_TEMPLATES: CustomAppTemplate[] = [
  {
    id: 'web-traffic',
    name: 'Web traffic',
    description: 'KPI tiles, a time series, a status breakdown and a table — all ES|QL.',
    build: webTraffic,
  },
  {
    id: 'error-triage',
    name: 'Error triage',
    description: 'Errors over time and by page, plus a form that triggers a workflow.',
    build: errorTriage,
  },
  {
    id: 'blank',
    name: 'Blank app',
    description: 'One panel and one ES|QL query to start from.',
    build: blank,
  },
];
