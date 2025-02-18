/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processDistanceResponse } from './process_distance_response';

test('should convert elasticsearch response into table', () => {
  const response = {
    aggregations: {
      distance: {
        buckets: {
          '06-Fv4cB_nxKbZ5eWyyP': {
            doc_count: 1,
            __kbnjoin__avg_of_bytes__673ff994: {
              value: 5794,
            },
          },
          '0a-Fv4cB_nxKbZ5eWyyP': {
            doc_count: 0,
            __kbnjoin__avg_of_bytes__673ff994: {
              value: 0,
            },
          },
          '1q-Fv4cB_nxKbZ5eWyyP': {
            doc_count: 2,
            __kbnjoin__avg_of_bytes__673ff994: {
              value: 5771,
            },
          },
        },
      },
    },
  };
  const table = processDistanceResponse(response, '__kbnjoin__count__673ff994');

  expect(table.size).toBe(2);

  const bucketProperties = table.get('1q-Fv4cB_nxKbZ5eWyyP');
  expect(bucketProperties?.__kbnjoin__count__673ff994).toBe(2);
  expect(bucketProperties?.__kbnjoin__avg_of_bytes__673ff994).toBe(5771);
});
