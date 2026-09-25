/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/public';

import { fetchLensFeatureFlags, lensFeatureFlags } from './feature_flags';

describe('fetchLensFeatureFlags', () => {
  it('seeds apiFormat from the first emission of the same observable', async () => {
    const firstEmission = !lensFeatureFlags.apiFormat.fallback;
    const apiFormatCalls: Array<{ fallback: boolean; value$: BehaviorSubject<boolean> }> = [];

    const getBooleanValue$ = jest.fn((flagName: string, fallback: boolean) => {
      const value$ = new BehaviorSubject(
        flagName === lensFeatureFlags.apiFormat.id ? firstEmission : fallback
      );
      if (flagName === lensFeatureFlags.apiFormat.id) {
        apiFormatCalls.push({ fallback, value$ });
      }
      return value$;
    });

    const flags = await fetchLensFeatureFlags({
      getBooleanValue$,
    } as unknown as FeatureFlagsStart);

    expect(apiFormatCalls).toHaveLength(1);
    const [{ fallback, value$ }] = apiFormatCalls;
    expect(fallback).toBe(lensFeatureFlags.apiFormat.fallback);
    expect(flags.apiFormat).toBe(firstEmission);
    expect(flags.apiFormat$).toBe(value$);

    const emissions: boolean[] = [];
    const subscription = flags.apiFormat$.subscribe((value) => {
      emissions.push(value);
    });
    const nextEmission = !firstEmission;
    value$.next(nextEmission);
    subscription.unsubscribe();

    expect(emissions).toEqual([firstEmission, nextEmission]);
  });
});
