/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggField } from './agg_field';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggSource } from '../../sources/es_agg_source';

const defaultParams = {
  label: 'my agg field',
  source: {} as unknown as IESAggSource,
  origin: FIELD_ORIGIN.SOURCE,
};

describe('supportsFieldMetaFromEs', () => {
  test('Non-counting aggregations should support field meta from ES', () => {
    const avgMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.AVG });
    expect(avgMetric.supportsFieldMetaFromEs()).toBe(true);
    const maxMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.MAX });
    expect(maxMetric.supportsFieldMetaFromEs()).toBe(true);
    const minMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.MIN });
    expect(minMetric.supportsFieldMetaFromEs()).toBe(true);
    const termsMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.TERMS });
    expect(termsMetric.supportsFieldMetaFromEs()).toBe(true);
  });

  test('Counting aggregations should not support field meta from ES', () => {
    const sumMetric = new AggField({ ...defaultParams, aggType: AGG_TYPE.SUM });
    expect(sumMetric.supportsFieldMetaFromEs()).toBe(false);
    const uniqueCountMetric = new AggField({
      ...defaultParams,
      aggType: AGG_TYPE.UNIQUE_COUNT,
    });
    expect(uniqueCountMetric.supportsFieldMetaFromEs()).toBe(false);
  });
});

describe('supportsFieldMetaFromLocalData', () => {
  describe('source is vector tiles', () => {
    const mvtSource = {
      isMvt: () => {
        return true;
      },
    } as unknown as IESAggSource;
    test('number metrics should support field meta from local', () => {
      const avgMetric = new AggField({
        ...defaultParams,
        source: mvtSource,
        aggType: AGG_TYPE.AVG,
      });
      expect(avgMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const maxMetric = new AggField({
        ...defaultParams,
        source: mvtSource,
        aggType: AGG_TYPE.MAX,
      });
      expect(maxMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const minMetric = new AggField({
        ...defaultParams,
        source: mvtSource,
        aggType: AGG_TYPE.MIN,
      });
      expect(minMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const sumMetric = new AggField({
        ...defaultParams,
        source: mvtSource,
        aggType: AGG_TYPE.SUM,
      });
      expect(sumMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const uniqueCountMetric = new AggField({
        ...defaultParams,
        source: mvtSource,
        aggType: AGG_TYPE.UNIQUE_COUNT,
      });
      expect(uniqueCountMetric.supportsFieldMetaFromLocalData()).toBe(true);
    });

    test('Non number metrics should not support field meta from local', () => {
      const termMetric = new AggField({
        ...defaultParams,
        source: mvtSource,
        aggType: AGG_TYPE.TERMS,
      });
      expect(termMetric.supportsFieldMetaFromLocalData()).toBe(false);
    });
  });

  describe('source is not vector tiles', () => {
    const geojsonSource = {
      isMvt: () => {
        return false;
      },
    } as unknown as IESAggSource;
    test('should always support field meta from local', () => {
      const avgMetric = new AggField({
        ...defaultParams,
        source: geojsonSource,
        aggType: AGG_TYPE.AVG,
      });
      expect(avgMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const maxMetric = new AggField({
        ...defaultParams,
        source: geojsonSource,
        aggType: AGG_TYPE.MAX,
      });
      expect(maxMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const minMetric = new AggField({
        ...defaultParams,
        source: geojsonSource,
        aggType: AGG_TYPE.MIN,
      });
      expect(minMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const sumMetric = new AggField({
        ...defaultParams,
        source: geojsonSource,
        aggType: AGG_TYPE.SUM,
      });
      expect(sumMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const uniqueCountMetric = new AggField({
        ...defaultParams,
        source: geojsonSource,
        aggType: AGG_TYPE.UNIQUE_COUNT,
      });
      expect(uniqueCountMetric.supportsFieldMetaFromLocalData()).toBe(true);
      const termMetric = new AggField({
        ...defaultParams,
        source: geojsonSource,
        aggType: AGG_TYPE.TERMS,
      });
      expect(termMetric.supportsFieldMetaFromLocalData()).toBe(true);
    });
  });
});
