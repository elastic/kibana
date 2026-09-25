/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomAppDefinition } from '../../common/app_definition';
import { ACTION_SET_DATA, SAMPLE_DATA_INDEX } from '../../common/constants';
import { kubernetesTemplate } from './kubernetes';
import { surface } from './surface';

export type { CustomAppTemplate } from './surface';
import type { CustomAppTemplate } from './surface';

const FROM = `FROM ${SAMPLE_DATA_INDEX}`;

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
    // Untabbed, so they persist across tabs.
    header: { type: 'panel', id: 'header', row: 0, column: 0, width: 34, height: 5 },
    filters: { type: 'panel', id: 'filters', row: 0, column: 34, width: 14, height: 5 },

    // Each tab lays out independently from the same starting row.
    kpis: { type: 'panel', id: 'kpis', row: 5, column: 0, width: 48, height: 6 },
    overTime: { type: 'panel', id: 'overTime', row: 11, column: 0, width: 32, height: 16 },
    status: { type: 'panel', id: 'status', row: 11, column: 32, width: 16, height: 16 },
    health: { type: 'panel', id: 'health', row: 27, column: 0, width: 48, height: 9 },

    topPages: { type: 'panel', id: 'topPages', row: 5, column: 0, width: 30, height: 20 },
    fileTypes: { type: 'panel', id: 'fileTypes', row: 5, column: 30, width: 18, height: 20 },

    countries: { type: 'panel', id: 'countries', row: 5, column: 0, width: 24, height: 17 },
    platforms: { type: 'panel', id: 'platforms', row: 5, column: 24, width: 24, height: 17 },

    errorHelp: { type: 'panel', id: 'errorHelp', row: 5, column: 0, width: 48, height: 4 },
    errors: { type: 'panel', id: 'errors', row: 9, column: 0, width: 48, height: 18 },
  },
  panels: {
    // Prose and controls read as page content, so they lose the panel frame.
    header: { hideBorder: true },
    filters: { hideBorder: true },
    // Everything below belongs to a tab; untabbed panels stay visible on all of them.
    kpis: { title: 'At a glance', tab: 'Overview' },
    overTime: { title: 'Requests over time', tab: 'Overview' },
    status: { title: 'Response codes', tab: 'Overview' },
    health: { hideBorder: true, tab: 'Overview' },
    topPages: { title: 'Busiest pages', tab: 'Content' },
    fileTypes: { title: 'Bandwidth by file type', tab: 'Content' },
    countries: { title: 'Destinations', tab: 'Audience' },
    platforms: { title: 'Client platforms', tab: 'Audience' },
    errors: { title: 'Pages returning errors', tab: 'Errors' },
    errorHelp: { hideBorder: true, tab: 'Errors' },
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
        query: `${FROM} | STATS requests = COUNT(*) BY time = BUCKET(@timestamp, 1 day), status = response.keyword | SORT time, status | LIMIT 500`,
      },
    ],
    status: [
      {
        path: '/codes',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY status = response.keyword | SORT requests DESC, status ASC | LIMIT 6`,
      },
    ],
    topPages: [
      {
        path: '/pages',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*), avg_bytes = ROUND(AVG(bytes)) BY page = url.keyword | SORT requests DESC, page ASC | LIMIT 10`,
      },
    ],
    countries: [
      {
        path: '/countries',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY country = geo.dest | SORT requests DESC, country ASC | LIMIT 8`,
      },
    ],
    fileTypes: [
      {
        path: '/types',
        shape: 'rows',
        query: `${FROM} | WHERE extension.keyword != "" | STATS bytes = SUM(bytes) BY type = extension.keyword | SORT bytes DESC, type ASC | LIMIT 6`,
      },
    ],
    platforms: [
      {
        path: '/platforms',
        shape: 'rows',
        query: `${FROM} | STATS requests = COUNT(*) BY os = machine.os.keyword | SORT requests DESC, os ASC | LIMIT 6`,
      },
    ],
    health: [
      {
        path: '/health',
        shape: 'first',
        query: `${FROM} | STATS ok = COUNT(CASE(response.keyword == "200", 1, null)), total = COUNT(*), slowest = MAX(bytes) | EVAL uptime = ROUND(100.0 * ok / total, 1)`,
      },
    ],
    errors: [
      {
        path: '/errors',
        shape: 'rows',
        query: `${FROM} | WHERE response.keyword != "200" | STATS errors = COUNT(*) BY page = url.keyword, status = response.keyword | SORT errors DESC, page ASC | LIMIT 12`,
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
    health: surface('health', [
      { id: 'root', component: 'Column', children: ['healthRow', 'uptime', 'more'], gap: 's' },
      { id: 'healthRow', component: 'Row', children: ['dot', 'detail'], gap: 'l', align: 'center' },
      {
        id: 'dot',
        component: 'Health',
        color: 'success',
        label: {
          call: 'concat',
          args: { values: ['Serving ', { path: '/health/uptime' }, '% OK'], separator: '' },
        },
      },
      {
        id: 'detail',
        component: 'DescriptionList',
        variant: 'inline',
        compressed: true,
        items: [
          {
            title: 'Largest response',
            description: { call: 'formatNumber', args: { value: { path: '/health/slowest' } } },
          },
          {
            title: 'Total requests',
            description: { call: 'formatNumber', args: { value: { path: '/health/total' } } },
          },
        ],
      },
      {
        id: 'uptime',
        component: 'Progress',
        label: 'Successful responses',
        value: { path: '/health/uptime' },
        max: 100,
        color: 'success',
      },
      { id: 'more', component: 'Accordion', label: 'How is this measured?', child: 'moreText' },
      {
        id: 'moreText',
        component: 'Text',
        variant: 'caption',
        color: 'subdued',
        text: 'The share of requests answered with a 200 status, over the selected time range.',
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
        search: true,
        sortField: 'requests',
        sortDirection: 'desc',
        columns: [
          { field: 'page', name: 'Page', truncate: true },
          { field: 'requests', name: 'Requests', dataType: 'number' },
          { field: 'avg_bytes', name: 'Avg bytes', dataType: 'number' },
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
    errorHelp: surface('errorHelp', [
      {
        id: 'root',
        component: 'Callout',
        color: 'warning',
        iconType: 'inspect',
        title: 'Select the magnifier on any row to inspect it',
      },
    ]),
    errors: surface(
      'errors',
      [
        { id: 'root', component: 'Column', children: ['table', 'detail'], gap: 'none' },
        {
          id: 'table',
          component: 'Table',
          caption: 'Pages returning non-200 responses, by status code',
          rows: { path: '/errors' },
          search: true,
          pageSize: 10,
          sortField: 'errors',
          sortDirection: 'desc',
          columns: [
            { field: 'page', name: 'Page', truncate: true },
            { field: 'status', name: 'Status', width: '100px' },
            { field: 'errors', name: 'Errors', dataType: 'number' },
          ],
          // The clicked row is merged into the action context as `row`, and
          // kbn.setData writes it to /selected — which is what opens the modal.
          rowActions: [
            {
              label: 'Inspect',
              iconType: 'inspect',
              action: { event: { name: ACTION_SET_DATA, context: { path: '/selected' } } },
            },
          ],
        },
        {
          id: 'detail',
          component: 'Modal',
          title: 'Error detail',
          isOpen: {
            call: 'not',
            args: { value: { call: 'isEmpty', args: { value: { path: '/selected' } } } },
          },
          child: 'detailBody',
          footer: 'detailClose',
          onClose: {
            event: { name: ACTION_SET_DATA, context: { path: '/selected', value: null } },
          },
        },
        {
          id: 'detailBody',
          component: 'DescriptionList',
          items: [
            { title: 'Page', description: { path: '/selected/page' } },
            { title: 'Status code', description: { path: '/selected/status' } },
            { title: 'Errors in range', description: { path: '/selected/errors' } },
          ],
        },
        {
          id: 'detailClose',
          component: 'Button',
          label: 'Close',
          variant: 'primary',
          action: { event: { name: ACTION_SET_DATA, context: { path: '/selected', value: null } } },
        },
      ],
      { selected: null }
    ),
  },
});

export const CUSTOM_APP_TEMPLATES: CustomAppTemplate[] = [
  {
    id: 'web-traffic',
    name: 'Web traffic',
    description:
      'Ten panels over the sample web logs: KPI tiles, time series, breakdowns and tables — all ES|QL.',
    indexPattern: SAMPLE_DATA_INDEX,
    build: webTraffic,
  },
  kubernetesTemplate,
];
