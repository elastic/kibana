/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatIcingaRules = [
  {
    // pre-ECS
    when: {
      exists: ['icinga.main.message'],
    },
    format: [
      {
        constant: '[Icinga][',
      },
      {
        field: 'icinga.main.facility',
      },
      {
        constant: '][',
      },
      {
        field: 'icinga.main.severity',
      },
      {
        constant: '] ',
      },
      {
        field: 'icinga.main.message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['icinga.debug.message'],
    },
    format: [
      {
        constant: '[Icinga][',
      },
      {
        field: 'icinga.debug.facility',
      },
      {
        constant: '][',
      },
      {
        field: 'icinga.debug.severity',
      },
      {
        constant: '] ',
      },
      {
        field: 'icinga.debug.message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['icinga.startup.message'],
    },
    format: [
      {
        constant: '[Icinga][',
      },
      {
        field: 'icinga.startup.facility',
      },
      {
        constant: '][',
      },
      {
        field: 'icinga.startup.severity',
      },
      {
        constant: '] ',
      },
      {
        field: 'icinga.startup.message',
      },
    ],
  },
];
