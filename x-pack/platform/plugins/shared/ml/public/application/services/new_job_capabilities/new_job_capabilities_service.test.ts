/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlJobCapsServiceFactory } from './new_job_capabilities_service';
import type { DataView } from '@kbn/data-views-plugin/public';

import type { MlApi } from '../ml_api_service';

// there is magic happening here. starting the include name with `mock..`
// ensures it can be lazily loaded by the jest.mock function below.
import mockCloudwatchResponse from '../__mocks__/cloudwatch_job_caps_response.json';

const mlApiServicesMock = {
  jobs: {
    newJobCaps: jest.fn(() => Promise.resolve(mockCloudwatchResponse)),
  },
} as unknown as MlApi;

const dataView = {
  id: 'cloudwatch-*',
  getIndexPattern: () => 'cloudwatch-*',
} as unknown as DataView;

describe('new_job_capabilities_service', () => {
  describe('cloudwatch newJobCaps()', () => {
    it('can construct job caps objects from endpoint json', async () => {
      const newJobCapsService = mlJobCapsServiceFactory(mlApiServicesMock);
      await newJobCapsService.initializeFromDataVIew(dataView);
      const { fields, aggs } = await newJobCapsService.newJobCaps;

      const networkOutField = fields.find((f) => f.id === 'NetworkOut') || { aggs: [] };
      const regionField = fields.find((f) => f.id === 'region') || { aggs: [] };
      const meanAgg = aggs.find((a) => a.id === 'mean') || { fields: [] };
      const distinctCountAgg = aggs.find((a) => a.id === 'distinct_count') || { fields: [] };

      expect(fields).toHaveLength(12);
      expect(aggs).toHaveLength(35);

      expect(networkOutField.aggs).toHaveLength(25);
      expect(regionField.aggs).toHaveLength(3);

      expect(meanAgg.fields).toHaveLength(7);
      expect(distinctCountAgg.fields).toHaveLength(10);
    });

    it('job caps including text fields', async () => {
      const newJobCapsService = mlJobCapsServiceFactory(mlApiServicesMock);
      await newJobCapsService.initializeFromDataVIew(dataView, true, false);
      const { fields, aggs } = await newJobCapsService.newJobCaps;

      expect(fields).toHaveLength(13); // one more field
      expect(aggs).toHaveLength(35);
    });

    it('job caps excluding event rate', async () => {
      const newJobCapsService = mlJobCapsServiceFactory(mlApiServicesMock);
      await newJobCapsService.initializeFromDataVIew(dataView, false, true);
      const { fields, aggs } = await newJobCapsService.newJobCaps;

      expect(fields).toHaveLength(11); // one less field
      expect(aggs).toHaveLength(35);
    });
  });

  describe('initializeFromEsqlColumns()', () => {
    const columns = [
      { name: '@timestamp', type: 'date' },
      { name: 'host', type: 'keyword' },
      { name: 'message', type: 'text' },
      { name: 'bytes_kb', type: 'double' },
      { name: 'requests', type: 'counter_long' },
      { name: 'unknown', type: 'unsupported' },
    ];

    it('creates fields from the query columns with the aggregations their types allow', () => {
      const newJobCapsService = mlJobCapsServiceFactory(mlApiServicesMock);
      newJobCapsService.initializeFromEsqlColumns(columns);
      const { fields, aggs } = newJobCapsService.newJobCaps;

      expect(fields.map(({ id }) => id)).toEqual([
        '__ml_event_rate_count__',
        '@timestamp',
        'bytes_kb',
        'host',
        'message',
        'requests',
      ]);
      expect(aggs).toHaveLength(35);

      const aggIds = (id: string) =>
        (fields.find((f) => f.id === id)?.aggs ?? []).map((agg) => agg.id);
      expect(aggIds('bytes_kb')).toEqual(expect.arrayContaining(['mean', 'sum', 'distinct_count']));
      expect(aggIds('host')).toEqual(expect.arrayContaining(['distinct_count']));
      expect(aggIds('host')).not.toContain('mean');
      expect(aggIds('@timestamp')).toEqual([]);
      expect(fields.find((f) => f.id === 'requests')?.counter).toBe(true);

      expect(newJobCapsService.dateFields.map(({ id }) => id)).toEqual(['@timestamp']);
      expect(newJobCapsService.catFields.map(({ id }) => id)).toEqual(['host', 'message']);
    });

    it('limits the functions of the listed columns', () => {
      const newJobCapsService = mlJobCapsServiceFactory(mlApiServicesMock);
      newJobCapsService.initializeFromEsqlColumns(columns, {
        bytes_kb: ['mean', 'high_mean', 'low_mean'],
        host: [],
      });
      const { fields, aggs } = newJobCapsService.newJobCaps;

      const aggIds = (id: string) =>
        (fields.find((f) => f.id === id)?.aggs ?? []).map((agg) => agg.id);
      expect(aggIds('bytes_kb')).toEqual(['mean', 'high_mean', 'low_mean']);
      expect(aggIds('host')).toEqual([]);
      expect(aggIds('requests')).toEqual(expect.arrayContaining(['sum', 'max']));

      const fieldIds = (id: string) =>
        (aggs.find((agg) => agg.id === id)?.fields ?? []).map((field) => field.id);
      expect(fieldIds('mean')).toContain('bytes_kb');
      expect(fieldIds('sum')).not.toContain('bytes_kb');
      expect(fieldIds('distinct_count')).not.toContain('host');
      expect(newJobCapsService.catFields.map(({ id }) => id)).toEqual(['host', 'message']);
    });

    it('can exclude the event rate field', () => {
      const newJobCapsService = mlJobCapsServiceFactory(mlApiServicesMock);
      newJobCapsService.initializeFromEsqlColumns(columns, {}, false);

      expect(newJobCapsService.fields.map(({ id }) => id)).not.toContain('__ml_event_rate_count__');
    });
  });
});
