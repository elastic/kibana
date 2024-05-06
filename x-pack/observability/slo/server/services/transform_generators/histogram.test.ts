/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createHistogramIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { HistogramTransformGenerator } from './histogram';

const generator = new HistogramTransformGenerator();

describe('Histogram Transform Generator', () => {
  describe('validation', () => {
    it('throws when the good filter is invalid', () => {
      const anSLO = createSLO({
        indicator: createHistogramIndicator({
          good: {
            field: 'latency',
            aggregation: 'range',
            from: 0,
            to: 100,
            filter: 'foo:',
          },
        }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid KQL: foo:/);
    });

    it('throws when the total filter is invalid', () => {
      const anSLO = createSLO({
        indicator: createHistogramIndicator({
          good: {
            field: 'latency',
            aggregation: 'value_count',
            filter: 'foo:',
          },
        }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid KQL: foo:/);
    });

    it('throws when the query_filter is invalid', () => {
      const anSLO = createSLO({
        indicator: createHistogramIndicator({ filter: '{ kql.query: invalid' }),
      });
      expect(() => generator.getTransformParams(anSLO)).toThrow(/Invalid KQL/);
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ id: 'irrelevant', indicator: createHistogramIndicator() });
    const transform = generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createHistogramIndicator(),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLO({
      indicator: createHistogramIndicator({ filter: 'labels.groupId: group-4' }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLO({
      indicator: createHistogramIndicator({ index: 'my-own-index*' }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('uses the provided timestampField', async () => {
    const anSLO = createSLO({
      indicator: createHistogramIndicator({
        timestampField: 'my-date-field',
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.sync?.time?.field).toBe('my-date-field');
    // @ts-ignore
    expect(transform.pivot?.group_by['@timestamp'].date_histogram.field).toBe('my-date-field');
  });

  it('aggregates using the numerator equation', async () => {
    const anSLO = createSLO({
      indicator: createHistogramIndicator(),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the numerator equation with filter', async () => {
    const anSLO = createSLO({
      indicator: createHistogramIndicator({
        good: {
          field: 'latency',
          aggregation: 'range',
          from: 0,
          to: 100,
          filter: 'foo: "bar"',
        },
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the denominator equation', async () => {
    const anSLO = createSLO({
      indicator: createHistogramIndicator(),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });

  it('aggregates using the denominator equation with filter', async () => {
    const anSLO = createSLO({
      indicator: createHistogramIndicator({
        total: {
          field: 'latency',
          aggregation: 'value_count',
          filter: 'foo: "bar"',
        },
      }),
    });
    const transform = generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });
});
