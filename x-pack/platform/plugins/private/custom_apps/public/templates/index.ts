/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomAppDefinition } from '../../common/app_definition';
import { ACTION_RUN_WORKFLOW } from '../../common/constants';

export interface CustomAppTemplate {
  id: string;
  name: string;
  description: string;
  build: () => CustomAppDefinition;
}

const serviceTriage = (): CustomAppDefinition => ({
  version: 1,
  title: 'Service triage',
  description: 'Health tiles, a service table, and a restart form wired to a workflow.',
  layout: {
    summary: { type: 'panel', id: 'summary', row: 0, column: 0, width: 48, height: 8 },
    services: { type: 'panel', id: 'services', row: 8, column: 0, width: 26, height: 14 },
    restart: { type: 'panel', id: 'restart', row: 8, column: 26, width: 22, height: 14 },
  },
  panels: {
    summary: { title: 'Overview' },
    services: { title: 'Services' },
    restart: { title: 'Restart a service' },
  },
  surfaces: {
    summary: [
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 'summary',
          catalogId: 'elastic/kibana-eui/v1',
          dataModel: { healthy: 12, degraded: 2, down: 1 },
          components: [
            {
              id: 'root',
              component: 'Row',
              children: ['okStat', 'warnStat', 'downStat'],
              gap: 'l',
            },
            {
              id: 'okStat',
              component: 'Stat',
              title: { call: 'formatNumber', args: { value: { path: '/healthy' } } },
              description: 'Healthy',
              color: 'success',
            },
            {
              id: 'warnStat',
              component: 'Stat',
              title: { call: 'formatNumber', args: { value: { path: '/degraded' } } },
              description: 'Degraded',
              color: 'warning',
            },
            {
              id: 'downStat',
              component: 'Stat',
              title: { call: 'formatNumber', args: { value: { path: '/down' } } },
              description: 'Down',
              color: 'danger',
            },
          ],
        },
      },
    ],
    services: [
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 'services',
          catalogId: 'elastic/kibana-eui/v1',
          dataModel: {
            rows: [
              { name: 'checkout', status: 'degraded', errors: 42 },
              { name: 'search', status: 'healthy', errors: 0 },
              { name: 'payments', status: 'down', errors: 318 },
            ],
          },
          components: [
            {
              id: 'root',
              component: 'Table',
              caption: 'Services and their current error counts',
              rows: { path: '/rows' },
              columns: [
                { field: 'name', name: 'Service' },
                { field: 'status', name: 'Status' },
                { field: 'errors', name: 'Errors', align: 'right' },
              ],
            },
          ],
        },
      },
    ],
    restart: [
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 'restart',
          catalogId: 'elastic/kibana-eui/v1',
          dataModel: { form: { service: 'checkout', drain: true, note: '' } },
          components: [
            {
              id: 'root',
              component: 'Column',
              children: ['intro', 'service', 'drain', 'note', 'submit'],
              gap: 'm',
            },
            {
              id: 'intro',
              component: 'Text',
              text: 'Restarting drains connections first unless you opt out.',
              variant: 'caption',
              color: 'subdued',
            },
            {
              id: 'service',
              component: 'ChoicePicker',
              label: 'Service',
              value: { path: '/form/service' },
              options: [
                { label: 'checkout', value: 'checkout' },
                { label: 'search', value: 'search' },
                { label: 'payments', value: 'payments' },
              ],
            },
            {
              id: 'drain',
              component: 'CheckBox',
              label: 'Drain connections first',
              value: { path: '/form/drain' },
            },
            {
              id: 'note',
              component: 'TextField',
              label: 'Reason',
              value: { path: '/form/note' },
              placeholder: 'Why are you restarting?',
            },
            {
              id: 'submit',
              component: 'Button',
              label: 'Restart service',
              variant: 'primary',
              iconType: 'refresh',
              disabled: { call: 'isEmpty', args: { value: { path: '/form/note' } } },
              action: {
                event: {
                  name: ACTION_RUN_WORKFLOW,
                  context: {
                    workflowId: 'restart-service',
                    service: { path: '/form/service' },
                    drain: { path: '/form/drain' },
                    note: { path: '/form/note' },
                  },
                },
              },
            },
          ],
        },
      },
    ],
  },
});

const runbook = (): CustomAppDefinition => ({
  version: 1,
  title: 'Runbook',
  description: 'Narrative text, a warning callout, and tabbed steps.',
  layout: {
    intro: { type: 'panel', id: 'intro', row: 0, column: 0, width: 48, height: 7 },
    steps: { type: 'panel', id: 'steps', row: 7, column: 0, width: 48, height: 16 },
  },
  panels: { intro: { title: 'Before you start' }, steps: { title: 'Steps' } },
  surfaces: {
    intro: [
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 'intro',
          catalogId: 'elastic/kibana-eui/v1',
          components: [
            { id: 'root', component: 'Column', children: ['warning', 'body'], gap: 's' },
            {
              id: 'warning',
              component: 'Callout',
              title: 'This runbook restarts production services',
              color: 'warning',
              iconType: 'warning',
            },
            {
              id: 'body',
              component: 'Text',
              text: 'Check the **on-call rota** before proceeding. Every step is reversible except step 3.',
            },
          ],
        },
      },
    ],
    steps: [
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 'steps',
          catalogId: 'elastic/kibana-eui/v1',
          dataModel: {
            checks: [
              { label: 'Confirm alert is real' },
              { label: 'Notify the channel' },
              { label: 'Capture a heap dump' },
            ],
          },
          components: [
            {
              id: 'root',
              component: 'Tabs',
              tabs: [
                { title: 'Checklist', child: 'checklist' },
                { title: 'Rollback', child: 'rollback' },
              ],
            },
            {
              id: 'checklist',
              component: 'Column',
              children: { componentId: 'checkItem', path: '/checks' },
              gap: 'xs',
            },
            {
              id: 'checkItem',
              component: 'Text',
              text: {
                call: 'concat',
                args: {
                  values: [{ call: '@index', args: { offset: 1 } }, { path: 'label' }],
                  separator: '. ',
                },
              },
            },
            {
              id: 'rollback',
              component: 'Text',
              text: 'Re-deploy the previous image tag and clear the CDN cache.',
            },
          ],
        },
      },
    ],
  },
});

export const CUSTOM_APP_TEMPLATES: CustomAppTemplate[] = [
  {
    id: 'service-triage',
    name: 'Service triage',
    description: 'Stat tiles, a data table, and a form that triggers a workflow.',
    build: serviceTriage,
  },
  {
    id: 'runbook',
    name: 'Runbook',
    description: 'Markdown text, a callout, and tabs with a repeated checklist.',
    build: runbook,
  },
  {
    id: 'blank',
    name: 'Blank app',
    description: 'One empty panel to start from.',
    build: () => ({
      version: 1,
      title: 'Untitled app',
      layout: {
        panel1: { type: 'panel', id: 'panel1', row: 0, column: 0, width: 24, height: 12 },
      },
      panels: { panel1: { title: 'New panel' } },
      surfaces: {
        panel1: [
          {
            version: 'v1.0',
            createSurface: {
              surfaceId: 'panel1',
              catalogId: 'elastic/kibana-eui/v1',
              components: [
                { id: 'root', component: 'Text', text: 'Edit this panel to get started.' },
              ],
            },
          },
        ],
      },
    }),
  },
];
