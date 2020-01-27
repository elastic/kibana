/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuitableIcon } from '../helpers/style_choices';
import { fetchTopNodes } from './fetch_top_nodes';

const icon = getSuitableIcon('');

describe('fetch_top_nodes', () => {
  it('should build terms agg', async () => {
    const postMock = jest.fn(() => Promise.resolve({ resp: {} }));
    await fetchTopNodes(postMock as any, 'test', [
      { color: '', hopSize: 5, icon, name: 'field1', selected: false, type: 'string' },
      { color: '', hopSize: 5, icon, name: 'field2', selected: false, type: 'string' },
    ]);
    expect(postMock).toHaveBeenCalledWith('../api/graph/searchProxy', {
      body: JSON.stringify({
        index: 'test',
        body: {
          size: 0,
          aggs: {
            sample: {
              sampler: {
                shard_size: 5000,
              },
              aggs: {
                top_values_field1: {
                  terms: {
                    field: 'field1',
                    size: 10,
                  },
                },
                top_values_field2: {
                  terms: {
                    field: 'field2',
                    size: 10,
                  },
                },
              },
            },
          },
        },
      }),
    });
  });

  it('should map result to nodes', async () => {
    const postMock = jest.fn(() =>
      Promise.resolve({
        resp: {
          aggregations: {
            sample: {
              top_values_field1: {
                buckets: [{ key: 'A' }, { key: 'B' }],
              },
              top_values_field2: {
                buckets: [{ key: 'C' }, { key: 'D' }],
              },
            },
          },
        },
      })
    );
    const result = await fetchTopNodes(postMock as any, 'test', [
      { color: 'red', hopSize: 5, icon, name: 'field1', selected: false, type: 'string' },
      { color: 'blue', hopSize: 5, icon, name: 'field2', selected: false, type: 'string' },
    ]);
    expect(result.length).toEqual(4);
    expect(result[0]).toEqual({
      color: 'red',
      data: {
        field: 'field1',
        term: 'A',
      },
      field: 'field1',
      icon,
      id: '',
      label: 'A',
      term: 'A',
    });
    expect(result[2]).toEqual({
      color: 'blue',
      data: {
        field: 'field2',
        term: 'C',
      },
      field: 'field2',
      icon,
      id: '',
      label: 'C',
      term: 'C',
    });
  });
});
