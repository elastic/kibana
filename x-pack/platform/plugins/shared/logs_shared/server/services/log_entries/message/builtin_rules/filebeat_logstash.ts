/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const filebeatLogstashRules = [
  {
    // pre-ECS
    when: {
      exists: ['logstash.log.message'],
    },
    format: [
      {
        constant: '[Logstash][',
      },
      {
        field: 'logstash.log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'logstash.log.module',
      },
      {
        constant: ' - ',
      },
      {
        field: 'logstash.log.message',
      },
    ],
  },
  {
    // ECS
    when: {
      all: [{ exists: ['ecs.version'] }, { existsPrefix: ['logstash.slowlog'] }],
    },
    format: [
      {
        constant: '[Logstash][',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        fieldsPrefix: 'logstash.slowlog',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['logstash.slowlog.message'],
    },
    format: [
      {
        constant: '[Logstash][',
      },
      {
        field: 'logstash.slowlog.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'logstash.slowlog.module',
      },
      {
        constant: ' - ',
      },
      {
        field: 'logstash.slowlog.message',
      },
    ],
  },
];
