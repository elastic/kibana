/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFieldMapping } from '@kbn/core/server';

export const rRuleMappingsField: SavedObjectsFieldMapping = {
  type: 'nested',
  properties: {
    freq: {
      type: 'keyword',
    },
    dtstart: {
      type: 'date',
      format: 'strict_date_time',
    },
    tzid: {
      type: 'keyword',
    },
    until: {
      type: 'date',
      format: 'strict_date_time',
    },
    count: {
      type: 'long',
    },
    interval: {
      type: 'long',
    },
    wkst: {
      type: 'keyword',
    },
    byweekday: {
      type: 'keyword',
    },
    bymonth: {
      type: 'short',
    },
    bysetpos: {
      type: 'long',
    },
    bymonthday: {
      type: 'short',
    },
    byyearday: {
      type: 'short',
    },
    byweekno: {
      type: 'short',
    },
    byhour: {
      type: 'long',
    },
    byminute: {
      type: 'long',
    },
    bysecond: {
      type: 'long',
    },
  },
};
