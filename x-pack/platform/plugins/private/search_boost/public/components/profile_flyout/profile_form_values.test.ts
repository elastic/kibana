/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsBoostProfile, IndicesBoostProfile } from '../../../common/types';
import {
  getDefaultValues,
  toProfileInput,
  toTimelineProfile,
  withProfileSettings,
} from './profile_form_values';

const LIMITS = { minBoost: 1, maxBoost: 19 };

const indicesProfile: IndicesBoostProfile = {
  name: 'storefront-search',
  is_builtin: false,
  type: 'indices',
  min_boost: 3,
  max_boost: 15,
  availability: 'one_extra_copy',
  prewarm: true,
  pinned: false,
};

const dataStreamsProfile: DataStreamsBoostProfile = {
  name: 'clickstream-recent',
  is_builtin: false,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 19, max_age: '12h' },
  standard: { min_boost: 1, max_boost: 10, max_age: '3d' },
  background: { min_boost: 1, max_boost: 2 },
};

describe('getDefaultValues', () => {
  it('starts every period at a min boost of 1 and the highest max boost', () => {
    const values = getDefaultValues('indices', LIMITS);

    expect(values.indices).toEqual({
      minBoost: '1',
      maxBoost: '19',
      oneExtraCopy: false,
      prewarm: false,
      pinned: false,
    });
    expect(values.recent).toEqual({ minBoost: '1', maxBoost: '19', maxAge: '1', maxAgeUnit: 'd' });
    expect(values.standard).toEqual({
      minBoost: '1',
      maxBoost: '19',
      maxAge: '7',
      maxAgeUnit: 'd',
    });
  });

  it('keeps the defaults within the limits and the ratio', () => {
    expect(getDefaultValues('indices', { minBoost: 2, maxBoost: 19, maxRatio: 3 }).indices).toEqual(
      expect.objectContaining({ minBoost: '2', maxBoost: '6' })
    );
    expect(getDefaultValues('indices', { minBoost: 0, maxBoost: 0.5 }).indices).toEqual(
      expect.objectContaining({ minBoost: '0.5', maxBoost: '0.5' })
    );
  });
});

describe('withProfileSettings', () => {
  it('fills in an indices profile, keeping the name', () => {
    const values = withProfileSettings(getDefaultValues('indices', LIMITS), indicesProfile);

    expect(values.name).toBe('');
    expect(values.indices).toEqual({
      minBoost: '3',
      maxBoost: '15',
      oneExtraCopy: true,
      prewarm: true,
      pinned: false,
    });
  });

  it('fills in the periods of a data streams profile', () => {
    const values = withProfileSettings(
      getDefaultValues('data_streams', LIMITS),
      dataStreamsProfile
    );

    expect(values.recent).toEqual({ minBoost: '2', maxBoost: '19', maxAge: '12', maxAgeUnit: 'h' });
    expect(values.standard).toEqual({
      minBoost: '1',
      maxBoost: '10',
      maxAge: '3',
      maxAgeUnit: 'd',
    });
    expect(values.background).toEqual({ minBoost: '1', maxBoost: '2' });
  });

  it('leaves a max age in other units empty', () => {
    const values = withProfileSettings(getDefaultValues('data_streams', LIMITS), {
      ...dataStreamsProfile,
      recent: { ...dataStreamsProfile.recent, max_age: '90m' },
    });

    expect(values.recent).toEqual(expect.objectContaining({ maxAge: '', maxAgeUnit: 'd' }));
  });

  it('never fills in pinned without prewarm', () => {
    const values = withProfileSettings(getDefaultValues('indices', LIMITS), {
      ...indicesProfile,
      prewarm: false,
      pinned: true,
    });

    expect(values.indices.pinned).toBe(false);
  });
});

describe('toProfileInput', () => {
  it.each([indicesProfile, dataStreamsProfile])('turns the values back into %p', (profile) => {
    const values = {
      ...withProfileSettings(getDefaultValues(profile.type, LIMITS), profile),
      name: profile.name,
    };
    // `toEqual` treats an undefined property as missing.
    expect(toProfileInput(values)).toEqual({ ...profile, is_builtin: undefined });
  });
});

describe('toTimelineProfile', () => {
  it('shows the saved value of a field that is empty or invalid', () => {
    const saved = withProfileSettings(getDefaultValues('data_streams', LIMITS), dataStreamsProfile);
    const values = {
      ...saved,
      recent: { ...saved.recent, maxAge: '', minBoost: '' },
      standard: { ...saved.standard, maxAge: '5' },
    };

    expect(toTimelineProfile(values, saved)).toEqual(
      expect.objectContaining({
        recent: { min_boost: 2, max_boost: 19, max_age: '12h' },
        standard: { min_boost: 1, max_boost: 10, max_age: '5d' },
      })
    );
  });
});
