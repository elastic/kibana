/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serialize } from './serialize';

describe('serialize()', () => {
  describe('WHEN serializing a fail processor', () => {
    it('SHOULD preserve the configured message', () => {
      expect(
        serialize({
          pipeline: {
            processors: [
              {
                id: 'fail-processor',
                type: 'fail',
                options: { message: 'Test Error Message' },
              },
            ],
          },
        }).processors
      ).toEqual([
        {
          fail: {
            message: 'Test Error Message',
          },
        },
      ]);
    });
  });
});
