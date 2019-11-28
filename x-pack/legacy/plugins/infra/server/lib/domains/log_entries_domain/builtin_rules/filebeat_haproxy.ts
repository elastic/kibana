/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const ecsFrontendFields = [
  {
    field: 'source.address',
  },
  {
    constant: ':',
  },
  {
    field: 'source.port',
  },
  {
    constant: ' ',
  },
  {
    field: 'haproxy.frontend_name',
  },
];

const preEcsFrontendFields = [
  {
    field: 'haproxy.client.ip',
  },
  {
    constant: ':',
  },
  {
    field: 'haproxy.client.port',
  },
  {
    constant: ' ',
  },
  {
    field: 'haproxy.frontend_name',
  },
];

const commonBackendFields = [
  {
    constant: ' -> ',
  },
  {
    field: 'haproxy.backend_name',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.server_name',
  },
];

const commonConnectionStatsFields = [
  {
    field: 'haproxy.connections.active',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.frontend',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.backend',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.server',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.retries',
  },
];

const commonQueueStatsFields = [
  {
    field: 'haproxy.server_queue',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.backend_queue',
  },
];

export const filebeatHaproxyRules = [
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.http.request.raw_request_line'],
    },
    format: [
      {
        constant: '[HAProxy][http] ',
      },
      ...ecsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' "',
      },
      {
        field: 'haproxy.http.request.raw_request_line',
      },
      {
        constant: '" ',
      },
      {
        field: 'http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'haproxy.http.request.time_wait_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'event.duration',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.connection_wait_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_wait_without_data_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'event.duration',
      },
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.connections.active'],
    },
    format: [
      {
        constant: '[HAProxy][tcp] ',
      },
      ...ecsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.error_message'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...ecsFrontendFields,
      {
        constant: ' ',
      },
      {
        field: 'haproxy.error_message',
      },
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.frontend_name'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...ecsFrontendFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.http.request.raw_request_line'],
    },
    format: [
      {
        constant: '[HAProxy][http] ',
      },
      ...preEcsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' "',
      },
      {
        field: 'haproxy.http.request.raw_request_line',
      },
      {
        constant: '" ',
      },
      {
        field: 'haproxy.http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'haproxy.http.request.time_wait_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.total_waiting_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.connection_wait_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_wait_without_data_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_active_ms',
      },
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.connections.active'],
    },
    format: [
      {
        constant: '[HAProxy][tcp] ',
      },
      ...preEcsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.error_message'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...preEcsFrontendFields,
      {
        constant: ' ',
      },
      {
        field: 'haproxy.error_message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.frontend_name'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...preEcsFrontendFields,
    ],
  },
];
