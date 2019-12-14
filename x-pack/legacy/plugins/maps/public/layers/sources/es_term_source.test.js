/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESTermSource, extractPropertiesMap } from './es_term_source';

jest.mock('../vector_layer', () => {});
jest.mock('ui/vis/editors/default/schemas', () => ({
  Schemas: function() {},
}));
jest.mock('../../kibana_services', () => {});
jest.mock('ui/agg_types', () => {});
jest.mock('ui/timefilter', () => {});

const indexPatternTitle = 'myIndex';
const termFieldName = 'myTermField';
const sumFieldName = 'myFieldGettingSummed';
const metricExamples = [
  {
    type: 'sum',
    field: sumFieldName,
    label: 'my custom label',
  },
  {
    // metric config is invalid beause field is missing
    type: 'max',
  },
  {
    // metric config is valid because "count" metric does not need to provide field
    type: 'count',
    label: '', // should ignore empty label fields
  },
];

describe('getMetricFields', () => {
  it('should add default "count" metric when no metrics are provided', () => {
    const source = new ESTermSource({
      indexPatternTitle: indexPatternTitle,
      term: termFieldName,
    });
    const metrics = source.getMetricFields();
    expect(metrics.length).toBe(1);
    expect(metrics[0]).toEqual({
      type: 'count',
      propertyKey: '__kbnjoin__count_groupby_myIndex.myTermField',
      propertyLabel: 'count of myIndex:myTermField',
    });
  });

  it('should remove incomplete metric configurations', () => {
    const source = new ESTermSource({
      indexPatternTitle: indexPatternTitle,
      term: termFieldName,
      metrics: metricExamples,
    });
    const metrics = source.getMetricFields();
    expect(metrics.length).toBe(2);
    expect(metrics[0]).toEqual({
      type: 'sum',
      field: sumFieldName,
      propertyKey: '__kbnjoin__sum_of_myFieldGettingSummed_groupby_myIndex.myTermField',
      propertyLabel: 'my custom label',
    });
    expect(metrics[1]).toEqual({
      type: 'count',
      propertyKey: '__kbnjoin__count_groupby_myIndex.myTermField',
      propertyLabel: 'count of myIndex:myTermField',
    });
  });
});

describe('_makeAggConfigs', () => {
  describe('no metrics', () => {
    let aggConfigs;
    beforeAll(() => {
      const source = new ESTermSource({
        indexPatternTitle: indexPatternTitle,
        term: termFieldName,
      });
      aggConfigs = source._makeAggConfigs();
    });

    it('should make default "count" metric agg config', () => {
      expect(aggConfigs.length).toBe(2);
      expect(aggConfigs[0]).toEqual({
        id: '__kbnjoin__count_groupby_myIndex.myTermField',
        enabled: true,
        type: 'count',
        schema: 'metric',
        params: {},
      });
    });

    it('should make "terms" buckets agg config', () => {
      expect(aggConfigs.length).toBe(2);
      expect(aggConfigs[1]).toEqual({
        id: 'join',
        enabled: true,
        type: 'terms',
        schema: 'segment',
        params: {
          field: termFieldName,
          size: 10000,
        },
      });
    });
  });

  describe('metrics', () => {
    let aggConfigs;
    beforeAll(() => {
      const source = new ESTermSource({
        indexPatternTitle: indexPatternTitle,
        term: 'myTermField',
        metrics: metricExamples,
      });
      aggConfigs = source._makeAggConfigs();
    });

    it('should ignore invalid metrics configs', () => {
      expect(aggConfigs.length).toBe(3);
    });

    it('should make agg config for each valid metric', () => {
      expect(aggConfigs[0]).toEqual({
        id: '__kbnjoin__sum_of_myFieldGettingSummed_groupby_myIndex.myTermField',
        enabled: true,
        type: 'sum',
        schema: 'metric',
        params: {
          field: sumFieldName,
        },
      });
      expect(aggConfigs[1]).toEqual({
        id: '__kbnjoin__count_groupby_myIndex.myTermField',
        enabled: true,
        type: 'count',
        schema: 'metric',
        params: {},
      });
    });
  });
});

describe('extractPropertiesMap', () => {
  const responseWithNumberTypes = {
    aggregations: {
      join: {
        buckets: [
          {
            key: 109,
            doc_count: 1130,
            '__kbnjoin__min_of_avlAirTemp_groupby_kibana_sample_data_ky_avl.kytcCountyNmbr': {
              value: 36,
            },
          },
          {
            key: 62,
            doc_count: 448,
            '__kbnjoin__min_of_avlAirTemp_groupby_kibana_sample_data_ky_avl.kytcCountyNmbr': {
              value: 0,
            },
          },
        ],
      },
    },
  };
  const countPropName = '__kbnjoin__count_groupby_kibana_sample_data_ky_avl.kytcCountyNmbr';
  const minPropName =
    '__kbnjoin__min_of_avlAirTemp_groupby_kibana_sample_data_ky_avl.kytcCountyNmbr';
  let propertiesMap;
  beforeAll(() => {
    propertiesMap = extractPropertiesMap(responseWithNumberTypes, [minPropName], countPropName);
  });

  it('should create key for each join term', () => {
    expect(propertiesMap.has('109')).toBe(true);
    expect(propertiesMap.has('62')).toBe(true);
  });

  it('should extract count property', () => {
    const properties = propertiesMap.get('109');
    expect(properties[countPropName]).toBe(1130);
  });

  it('should extract min property', () => {
    const properties = propertiesMap.get('109');
    expect(properties[minPropName]).toBe(36);
  });

  it('should extract property with value of "0"', () => {
    const properties = propertiesMap.get('62');
    expect(properties[minPropName]).toBe(0);
  });
});
