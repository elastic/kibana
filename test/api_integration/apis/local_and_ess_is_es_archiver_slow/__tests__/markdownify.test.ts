/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expect } from '@jest/globals';
import { FinalResult } from '../shared.types';
import { markdownify } from '../markdown';

const xs: FinalResult[] = [
  {
    name: 'x-pack/test/functional/es_archives/logstash_functional',
    avg: '5.0',
    min: '4.6',
    max: '5.6',
  },
  {
    name: 'test/functional/fixtures/es_archiver/many_fields',
    avg: '1.0',
    min: '1.0',
    max: '1.1',
  },
  {
    name: 'x-pack/test/functional/es_archives/ml/farequote',
    avg: '10.1',
    min: '9.8',
    max: '10.6',
  },
];

describe(`Markdownify Unit Test`, () => {
  describe(`markdownify fn`, function () {
    it(`should render a table row, in github markdown`, async () => {
      const underTest: FinalResult = xs[0];
      const actual = markdownify('LOCAL')(underTest);
      expect(actual).toMatchInlineSnapshot(`
        "
        x-pack/test/functional/es_archives/logstash_functional
        | LOCAL avg / min / max | 5.0 / 4.6 / 5.6 | Cell |
        "
      `);
    });
  });
});
