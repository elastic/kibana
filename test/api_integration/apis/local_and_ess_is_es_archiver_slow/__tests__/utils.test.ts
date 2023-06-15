/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expect } from '@jest/globals';
import { LoadResult, LoadResults } from '../shared.types';
import { computeAverageMinMax } from '../calc';

const xs = [
  {
    name: 'x-pack/test/functional/es_archives/logstash_functional',
    label: 'Load #3 of Archive: [x-pack/test/functional/es_archives/logstash_functional]',
    metrics: [
      {
        milliseconds: 1002,
      },
      {
        milliseconds: 1001,
      },
      {
        milliseconds: 99999,
      },
    ],
    avg: 0,
    min: 0,
    max: 0,
  },
  {
    name: 'test/functional/fixtures/es_archiver/many_fields',
    label: 'Load #3 of Archive: [test/functional/fixtures/es_archiver/many_fields]',
    metrics: [
      {
        milliseconds: 99899,
      },
      {
        milliseconds: 1002,
      },
      {
        milliseconds: 1001,
      },
    ],
    avg: 0,
    min: 0,
    max: 0,
  },
  {
    name: 'x-pack/test/functional/es_archives/ml/farequote',
    label: 'Load #3 of Archive: [x-pack/test/functional/es_archives/ml/farequote]',
    metrics: [
      {
        milliseconds: 1002,
      },
      {
        milliseconds: 100,
      },
      {
        milliseconds: 1001,
      },
    ],
    avg: 0,
    min: 0,
    max: 0,
  },
];
describe(`Utils Unit Test`, () => {
  describe(`computeAverageMinMax fn`, function () {
    it(`should show seconds, not ms`, async () => {
      const a: LoadResults = new Set<LoadResult>(xs);
      const actual = await computeAverageMinMax(a);
      expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "avg": "34.0",
          "max": "100.0",
          "min": "1.0",
          "name": "x-pack/test/functional/es_archives/logstash_functional",
        },
        Object {
          "avg": "34.0",
          "max": "99.9",
          "min": "1.0",
          "name": "test/functional/fixtures/es_archiver/many_fields",
        },
        Object {
          "avg": "0.7",
          "max": "1.0",
          "min": "0.1",
          "name": "x-pack/test/functional/es_archives/ml/farequote",
        },
      ]
    `);
    });
  });
});
