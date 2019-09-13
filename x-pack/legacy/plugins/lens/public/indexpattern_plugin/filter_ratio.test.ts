/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculateFilterRatio } from './filter_ratio';
import { KibanaDatatable } from 'src/legacy/core_plugins/interpreter/common';

describe('calculate_filter_ratio', () => {
  it('should collapse two rows and columns into a single row and column', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [{ id: 'bucket', name: 'A' }, { id: 'filter-ratio', name: 'B' }],
      rows: [{ bucket: 'a', 'filter-ratio': 5 }, { bucket: 'b', 'filter-ratio': 10 }],
    };

    expect(calculateFilterRatio.fn(input, { id: 'bucket' }, {})).toEqual({
      columns: [
        {
          id: 'bucket',
          name: 'A',
          formatHint: {
            id: 'percent',
          },
        },
      ],
      rows: [{ bucket: 0.5 }],
      type: 'kibana_datatable',
    });
  });

  it('should return 0 when the denominator is undefined', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [{ id: 'bucket', name: 'A' }, { id: 'filter-ratio', name: 'B' }],
      rows: [{ bucket: 'a', 'filter-ratio': 5 }, { bucket: 'b' }],
    };

    expect(calculateFilterRatio.fn(input, { id: 'bucket' }, {})).toEqual({
      columns: [
        {
          id: 'bucket',
          name: 'A',
          formatHint: {
            id: 'percent',
          },
        },
      ],
      rows: [{ bucket: 0 }],
      type: 'kibana_datatable',
    });
  });

  it('should return 0 when the denominator is 0', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [{ id: 'bucket', name: 'A' }, { id: 'filter-ratio', name: 'B' }],
      rows: [{ bucket: 'a', 'filter-ratio': 5 }, { bucket: 'b', 'filter-ratio': 0 }],
    };

    expect(calculateFilterRatio.fn(input, { id: 'bucket' }, {})).toEqual({
      columns: [
        {
          id: 'bucket',
          name: 'A',
          formatHint: {
            id: 'percent',
          },
        },
      ],
      rows: [{ bucket: 0 }],
      type: 'kibana_datatable',
    });
  });

  it('should keep columns which are not mapped', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [
        { id: 'bucket', name: 'A' },
        { id: 'filter-ratio', name: 'B' },
        { id: 'extra', name: 'C' },
      ],
      rows: [
        { bucket: 'a', 'filter-ratio': 5, extra: 'first' },
        { bucket: 'b', 'filter-ratio': 10, extra: 'second' },
      ],
    };

    expect(calculateFilterRatio.fn(input, { id: 'bucket' }, {})).toEqual({
      columns: [
        {
          id: 'bucket',
          name: 'A',
          formatHint: {
            id: 'percent',
          },
        },
        { id: 'extra', name: 'C' },
      ],
      rows: [
        {
          bucket: 0.5,
          extra: 'first',
        },
      ],
      type: 'kibana_datatable',
    });
  });

  it('should attach a percentage format hint to the ratio column', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [{ id: 'bucket', name: 'A' }, { id: 'filter-ratio', name: 'B' }],
      rows: [{ bucket: 'a', 'filter-ratio': 5 }, { bucket: 'b', 'filter-ratio': 10 }],
    };

    expect(calculateFilterRatio.fn(input, { id: 'bucket' }, {}).columns[0]).toEqual({
      id: 'bucket',
      name: 'A',
      formatHint: {
        id: 'percent',
      },
    });
  });
});
