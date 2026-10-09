/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDatafeed } from './edit_utils';

describe('extractDatafeed', () => {
  const esqlDatafeed = {
    datafeed_config: {
      datafeed_id: 'esql-datafeed',
      esql_query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
      source_time_field: '@timestamp',
      grouping_interval: '1h',
      query_delay: '60s',
      frequency: '300s',
      indices: ['must-not-be-sent'],
      query: { match_all: {} },
      scroll_size: 1000,
      aggregations: { ignored: {} },
      script_fields: { ignored: {} },
      runtime_mappings: { ignored: {} },
      indices_options: { ignore_unavailable: true },
    },
  };

  it('only returns operational changes for an ES|QL datafeed', () => {
    const datafeedUpdate = extractDatafeed(esqlDatafeed, {
      datafeedQuery: 'FROM logs-* | STATS count = COUNT(*) BY service.name',
      datafeedQueryDelay: '120s',
      datafeedFrequency: '600s',
      datafeedScrollSize: 500,
      datafeedProjectRouting: undefined,
    });

    expect(datafeedUpdate).toEqual({ query_delay: '120s', frequency: '600s' });
    expect(datafeedUpdate).not.toEqual(
      expect.objectContaining({
        esql_query: expect.anything(),
        query: expect.anything(),
        indices: expect.anything(),
        scroll_size: expect.anything(),
        aggregations: expect.anything(),
        script_fields: expect.anything(),
        runtime_mappings: expect.anything(),
        indices_options: expect.anything(),
      })
    );
  });

  it('retains classic query and scroll-size updates', () => {
    const datafeedUpdate = extractDatafeed(
      {
        datafeed_config: {
          query: { match_all: {} },
          query_delay: '60s',
          frequency: '300s',
          scroll_size: 1000,
        },
      },
      {
        datafeedQuery: JSON.stringify({ term: { user: 'kimchy' } }),
        datafeedQueryDelay: '60s',
        datafeedFrequency: '300s',
        datafeedScrollSize: 500,
      }
    );

    expect(datafeedUpdate).toEqual({ query: { term: { user: 'kimchy' } }, scroll_size: 500 });
  });
});
