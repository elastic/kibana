/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILTIN_PROFILES } from '../../../common/presets';
import type { BoostProfile } from '../../../common/types';
import {
  createEmptyDraft,
  draftFromProfile,
  draftToProfileInput,
  getDraftErrors,
  getDraftProfile,
  hasDraftErrors,
} from './profile_draft';

const dataStreamsProfile: BoostProfile = {
  name: 'events-recent-fast',
  type: 'data_streams',
  is_builtin: false,
  recent: { min_boost: 2, max_boost: 4, max_age: '1d' },
  standard: { min_boost: 1, max_boost: 2, max_age: '7d' },
  background: { min_boost: 1, max_boost: 5000 },
};

describe('profile drafts', () => {
  it('round-trips built-in and custom profiles through a draft', () => {
    [...BUILTIN_PROFILES, dataStreamsProfile].forEach(({ is_builtin: _isBuiltin, ...profile }) => {
      expect(draftToProfileInput(draftFromProfile({ ...profile, is_builtin: false }))).toEqual(
        profile
      );
    });
  });

  it('requires a name for a new profile', () => {
    expect(getDraftErrors(createEmptyDraft(), [])).toEqual({
      name: 'required',
      indicesRange: undefined,
    });
  });

  it('rejects names that are already taken', () => {
    const draft = { ...createEmptyDraft(), name: 'storefront' };
    expect(getDraftErrors(draft, ['storefront']).name).toBe('already_exists');
  });

  it('only validates the fields of the selected type', () => {
    const draft = { ...createEmptyDraft(), name: 'fast', type: 'data_streams' as const };
    draft.indices = { ...draft.indices, minBoost: '' };

    expect(hasDraftErrors(getDraftErrors(draft, []))).toBe(false);
  });

  it('keeps hour-based max ages when round-tripping', () => {
    const profile: BoostProfile = {
      ...dataStreamsProfile,
      recent: { ...dataStreamsProfile.recent, max_age: '12h' },
    };
    const { is_builtin: _isBuiltin, ...input } = profile;

    expect(draftToProfileInput(draftFromProfile(profile))).toEqual(input);
  });

  it('flags a standard window shorter than the recent window', () => {
    const draft = draftFromProfile({
      ...dataStreamsProfile,
      standard: { ...dataStreamsProfile.standard, max_age: '1d' },
      recent: { ...dataStreamsProfile.recent, max_age: '3d' },
    });

    expect(getDraftErrors(draft, []).standardMaxAge).toBe('below_previous_period');
  });
});

describe('getDraftProfile', () => {
  it('returns the draft as a profile, whatever its name', () => {
    const draft = { ...draftFromProfile(dataStreamsProfile), name: '' };

    expect(getDraftProfile(draft)).toEqual(draftToProfileInput(draft));
  });

  it('has no profile while a value is invalid', () => {
    const draft = draftFromProfile(dataStreamsProfile);
    draft.dataStreams.recent.maxAge = '';

    expect(getDraftProfile(draft)).toBeUndefined();
  });
});
