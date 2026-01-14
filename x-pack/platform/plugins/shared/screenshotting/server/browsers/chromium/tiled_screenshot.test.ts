/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partitionScreen } from './tiled_screenshot';

describe('stitched_screenshot', () => {
  describe('partitionScreen', () => {
    it('handles 0 size image', () => {
      const result = partitionScreen({ x: 0, y: 0, width: 0, height: 0 });
      expect(result).toMatchInlineSnapshot(`Array []`);
    });

    it('handles a small image', () => {
      const result = partitionScreen({ x: 1, y: 2, width: 10, height: 20 });
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "height": 20,
            "width": 10,
            "x": 1,
            "y": 2,
          },
        ]
      `);
    });

    it('handles a large image', () => {
      const result = partitionScreen({ x: 3, y: 4, width: 2000, height: 20001 });
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "height": 8000,
            "width": 2000,
            "x": 3,
            "y": 4,
          },
          Object {
            "height": 8000,
            "width": 2000,
            "x": 3,
            "y": 8004,
          },
          Object {
            "height": 4001,
            "width": 2000,
            "x": 3,
            "y": 16004,
          },
        ]
      `);
    });
  });
});
