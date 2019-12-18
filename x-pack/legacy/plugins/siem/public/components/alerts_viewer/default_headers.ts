/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../timeline/body/helpers';
import { timelineDefaults, SubsetTimelineModel } from '../../store/timeline/model';

export const alertsHeaders: ColumnHeader[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.module',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.dataset',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.severity',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'observer.name',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'agent.id',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'agent.type',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
];

export const alertsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: alertsHeaders,
};
