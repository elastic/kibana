/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformIn } from './transform_in';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensTransformIn } from './types';

describe('duration schema transformIn', () => {
  const transformDrilldownsIn = jest.fn(<T extends { drilldowns?: unknown }>(state: T) => ({
    state,
    references: [],
  }));

  const durationConfig = {
    type: 'metric',
    layers: [{ metrics: [{ format: { type: 'duration', from: 'm', to: 'humanize' } }] }],
  } as unknown as Parameters<LensTransformIn>[0];

  it('rejects legacy duration units when GA schemas are active', () => {
    const builder = new LensConfigBuilder(undefined, true);
    const transformIn = getTransformIn(builder, transformDrilldownsIn, true);

    expect(() => transformIn(durationConfig, true)).toThrow(/GA unit names/);
  });

  it('accepts legacy duration units when GA schemas are disabled', () => {
    const builder = new LensConfigBuilder(undefined, true);
    const transformIn = getTransformIn(builder, transformDrilldownsIn, true);

    let thrownError: Error | undefined;
    try {
      transformIn(durationConfig, false);
    } catch (e) {
      thrownError = e as Error;
    }

    expect(thrownError?.message).not.toMatch(/GA unit names/);
  });
});
