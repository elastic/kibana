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
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 4,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 1204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 1604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 2004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 2404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 2804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 3204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 3604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 4004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 4404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 4804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 5204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 5604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 6004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 6404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 6804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 7204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 7604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 8004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 8404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 8804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 9204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 9604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 10004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 10404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 10804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 11204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 11604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 12004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 12404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 12804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 13204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 13604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 14004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 14404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 14804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 15204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 15604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 16004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 16404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 16804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 17204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 17604,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 18004,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 18404,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 18804,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 19204,
          },
          Object {
            "height": 400,
            "width": 2000,
            "x": 3,
            "y": 19604,
          },
          Object {
            "height": 1,
            "width": 2000,
            "x": 3,
            "y": 20004,
          },
        ]
      `);
    });
  });
});
