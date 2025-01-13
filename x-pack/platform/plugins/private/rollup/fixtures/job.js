/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString } from '@kbn/test-jest-helpers';

const initialValues = {
  dateHistogramField: 'timestamp',
  dateHistogramInterval: '24h',
  dateHistogramTimeZone: 'UTC',
  documentsProcessed: 10,
  histogram: [{ name: 'DistanceMiles' }, { name: 'FlightTimeMin' }],
  id: 'test',
  indexPattern: 'kibana*',
  json: {
    foo: 'bar',
  },
  metrics: [
    {
      name: 'dayOfWeek',
      types: ['avg', 'max', 'min'],
    },
    {
      name: 'distanceKilometers',
      types: ['avg', 'max'],
    },
  ],
  pagesProcessed: 3,
  rollupCron: '0 0 0 ? * 7',
  rollupDelay: '1d',
  rollupIndex: 'my_rollup_index',
  rollupsIndexed: 2,
  status: 'stopped',
  terms: [{ name: 'Dest' }, { name: 'Carrier' }, { name: 'DestCountry' }],
  triggerCount: 7,
};

const statuses = [
  'stopped',
  'stopping',
  'started',
  'indexing',
  'abort',
  'abc' /* unknown status */,
];

export const getJob = (values = { id: getRandomString() }) => ({ ...initialValues, ...values });
export const jobCount = statuses.length;
export const getJobs = () => statuses.map((status) => getJob({ status, id: getRandomString() }));
