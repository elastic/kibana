/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { avg, computeAvgDiffTimes } from '../calc';
import { TimeTakenToLoadArchive } from '../shared.types';
import { expect } from '@jest/globals';

describe(`Calculations Unit Test`, () => {
  it(`should return 2 for avg([1, 2, 3])`, () => {
    const actual = avg([1, 2, 3]);

    expect(actual).toMatchInlineSnapshot(`2`);
  });
  it(`should return 3836 for avg([3815, 3864, 3829]`, () => {
    const actual = avg([3815, 3864, 3829]);

    expect(actual).toMatchInlineSnapshot(`3836`);
  });
  it(`should compute average diff time to be 3836, just like the test block above`, () => {
    const diffTimes: TimeTakenToLoadArchive[] = [
      {
        archiveName: 'x-pack/test/functional/es_archives/ml/farequote',
        label: 'Load #1 of Archive: [x-pack/test/functional/es_archives/ml/farequote]',
        timeTaken: {
          milliseconds: 3815,
        },
      },
      {
        archiveName: 'x-pack/test/functional/es_archives/ml/farequote',
        label: 'Load #2 of Archive: [x-pack/test/functional/es_archives/ml/farequote]',
        timeTaken: {
          milliseconds: 3864,
        },
      },
      {
        archiveName: 'x-pack/test/functional/es_archives/ml/farequote',
        label: 'Load #3 of Archive: [x-pack/test/functional/es_archives/ml/farequote]',
        timeTaken: {
          milliseconds: 3829,
        },
      },
    ];
    expect(computeAvgDiffTimes(diffTimes)).toMatchInlineSnapshot(`3836`);
  });
});
