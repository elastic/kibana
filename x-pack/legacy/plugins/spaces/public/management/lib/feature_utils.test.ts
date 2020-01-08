/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEnabledFeatures } from './feature_utils';
import { Feature } from '../../../../../../plugins/features/public';

const buildFeatures = () =>
  [
    {
      id: 'feature1',
      name: 'feature 1',
    },
    {
      id: 'feature2',
      name: 'feature 2',
    },
    {
      id: 'feature3',
      name: 'feature 3',
    },
    {
      id: 'feature4',
      name: 'feature 4',
    },
  ] as Feature[];

const buildSpace = (disabledFeatures = [] as string[]) => ({
  id: 'space',
  name: 'space',
  disabledFeatures,
});

describe('getEnabledFeatures', () => {
  it('returns all features when no features are disabled', () => {
    expect(getEnabledFeatures(buildFeatures(), buildSpace())).toEqual(buildFeatures());
  });

  it('returns no features when all features are disabled', () => {
    expect(
      getEnabledFeatures(
        buildFeatures(),
        buildSpace(['feature1', 'feature2', 'feature3', 'feature4'])
      )
    ).toEqual([]);
  });

  it('ignores unknown disabled features', () => {
    expect(
      getEnabledFeatures(buildFeatures(), buildSpace(['unknownFeature1', 'unknownFeature2']))
    ).toEqual(buildFeatures());
  });
});
