/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatApache2Rules = [
  {
    // pre-ECS
    when: {
      exists: ['apache2.access'],
    },
    format: [
      {
        constant: '[apache][access] ',
      },
      {
        field: 'apache2.access.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.user_name',
      },
      {
        constant: ' "',
      },
      {
        field: 'apache2.access.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'apache2.access.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'apache2.access.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.body_sent.bytes',
      },
    ],
  },
  {
    // ECS
    when: {
      values: {
        'event.dataset': 'apache.error',
      },
    },
    format: [
      {
        constant: '[apache][',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['apache2.error.message'],
    },
    format: [
      {
        constant: '[apache][',
      },
      {
        field: 'apache2.error.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'apache2.error.message',
      },
    ],
  },
];
