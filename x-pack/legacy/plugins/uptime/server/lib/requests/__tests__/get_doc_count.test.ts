/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDocCount } from '../get_doc_count';

describe('getDocCount', () => {
  let mockHits: any[];
  let mockEsCountResult: any;

  beforeEach(() => {
    mockHits = [
      {
        _source: {
          '@timestamp': '2018-10-30T18:51:59.792Z',
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:53:59.792Z',
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:55:59.792Z',
        },
      },
    ];
    mockEsCountResult = {
      count: mockHits.length,
    };
  });

  it('returns data in appropriate shape', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsCountResult);
    const { count } = await getDocCount({ callES: mockEsClient });
    expect(count).toEqual(3);
  });
});
