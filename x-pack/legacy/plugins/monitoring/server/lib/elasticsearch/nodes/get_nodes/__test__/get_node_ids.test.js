/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNodeIds } from '../get_node_ids';

describe('getNodeIds', () => {
  it('should return a list of ids and uuids', async () => {
    const callWithRequest = jest.fn().mockReturnValue({
      aggregations: {
        composite_data: {
          buckets: [
            {
              key: {
                name: 'foobar',
                uuid: 1,
              },
            },
            {
              key: {
                name: 'barfoo',
                uuid: 2,
              },
            },
          ],
        },
      },
    });
    const req = {
      payload: {
        timeRange: {
          min: 1,
          max: 2,
        },
      },
      server: {
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithRequest,
            }),
          },
        },
      },
    };
    const clusterUuid = '1cb';

    const result = await getNodeIds(req, '.monitoring-es-*', { clusterUuid }, 10);
    expect(result).toEqual([{ name: 'foobar', uuid: 1 }, { name: 'barfoo', uuid: 2 }]);
  });
});
