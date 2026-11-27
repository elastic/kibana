/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Settings } from '../../types';
import { appContextService } from '../app_context';
import { getSettingsOrUndefined } from '../settings';

import {
  isSpaceAwarenessEnabled,
  isSpaceAwarenessMigrationPending,
  getAllSpaceIds,
} from './helpers';

jest.mock('../app_context');
jest.mock('../settings');

function mockFeatureFlag(val: boolean) {
  jest.mocked(appContextService.getExperimentalFeatures).mockReturnValue({
    useSpaceAwareness: val,
  } as any);
}

function mockGetSettings(settings?: Partial<Settings>) {
  if (settings) {
    jest.mocked(getSettingsOrUndefined).mockResolvedValue(settings as any);
  } else {
    jest.mocked(getSettingsOrUndefined).mockResolvedValue(undefined);
  }
}

describe('isSpaceAwarenessEnabled', () => {
  beforeEach(() => {
    jest.mocked(appContextService.getExperimentalFeatures).mockReset();
    jest.mocked(getSettingsOrUndefined).mockReset();
  });
  it('should return false if feature flag is disabled', async () => {
    mockFeatureFlag(false);
    await expect(isSpaceAwarenessEnabled()).resolves.toBe(false);
  });

  it('should return false if feature flag is enabled but user did not optin', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: undefined,
    });
    const res = await isSpaceAwarenessEnabled();

    expect(res).toBe(false);
  });

  it('should return false if feature flag is enabled and settings do not exists', async () => {
    mockFeatureFlag(true);
    mockGetSettings();
    const res = await isSpaceAwarenessEnabled();

    expect(res).toBe(false);
  });

  it('should return true if feature flag is enabled and user optin', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: 'success',
    });
    const res = await isSpaceAwarenessEnabled();

    expect(res).toBe(true);
  });
});

describe('isSpaceAwarenessMigrationPending', () => {
  beforeEach(() => {
    jest.mocked(appContextService.getExperimentalFeatures).mockReset();
    jest.mocked(getSettingsOrUndefined).mockReset();
  });
  it('should return false if feature flag is disabled', async () => {
    mockFeatureFlag(false);
    const res = await isSpaceAwarenessMigrationPending();

    expect(res).toBe(false);
  });

  it('should return false if feature flag is enabled but user did not optin', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: undefined,
    });
    const res = await isSpaceAwarenessMigrationPending();

    expect(res).toBe(false);
  });

  it('should return false if feature flag is enabled and settings do not exists', async () => {
    mockFeatureFlag(true);
    mockGetSettings();
    const res = await isSpaceAwarenessMigrationPending();

    expect(res).toBe(false);
  });

  it('should return false if feature flag is enabled and migration is complete', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: 'success',
    });
    const res = await isSpaceAwarenessMigrationPending();

    expect(res).toBe(false);
  });

  it('should return true if feature flag is enabled and migration is in progress', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: 'pending',
      use_space_awareness_migration_started_at: new Date().toISOString(),
    });
    const res = await isSpaceAwarenessMigrationPending();

    expect(res).toBe(true);
  });

  it('should return false if feature flag is enabled and an old migration is in progress', async () => {
    mockFeatureFlag(true);
    mockGetSettings({
      use_space_awareness_migration_status: 'pending',
      use_space_awareness_migration_started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    const res = await isSpaceAwarenessMigrationPending();

    expect(res).toBe(false);
  });
});

describe('getAllSpaceIds', () => {
  const mockFind = jest.fn();

  beforeEach(() => {
    mockFind.mockReset();
    jest.mocked(appContextService.getExperimentalFeatures).mockReset();
    jest.mocked(getSettingsOrUndefined).mockReset();
    jest.mocked(appContextService.getInternalUserSOClientForSpaces).mockReturnValue({
      find: mockFind,
    } as any);
  });

  it('lists the real space objects (ids) when space awareness is enabled', async () => {
    mockFeatureFlag(true);
    mockGetSettings({ use_space_awareness_migration_status: 'success' });
    mockFind.mockResolvedValue({
      saved_objects: [{ id: 'default' }, { id: 'space1' }, { id: 'space2' }],
      total: 3,
    });

    const res = await getAllSpaceIds();

    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ type: 'space' }));
    expect(res).toEqual({ spaceIds: new Set(['default', 'space1', 'space2']), truncated: false });
  });

  it('returns the global scope (*) without listing spaces when the feature flag is off', async () => {
    mockFeatureFlag(false);

    const res = await getAllSpaceIds();

    expect(res).toEqual({ spaceIds: new Set(['*']), truncated: false });
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('returns the global scope (*) when the flag is on but Fleet has not migrated', async () => {
    // Legacy policies are still space-agnostic until migration completes, so a global grant is
    // required even though the feature flag is enabled.
    mockFeatureFlag(true);
    mockGetSettings({ use_space_awareness_migration_status: 'pending' });

    const res = await getAllSpaceIds();

    expect(res).toEqual({ spaceIds: new Set(['*']), truncated: false });
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('fails closed to a global check when no space can be listed', async () => {
    mockFeatureFlag(true);
    mockGetSettings({ use_space_awareness_migration_status: 'success' });
    mockFind.mockResolvedValue({ saved_objects: [], total: 0 });

    const res = await getAllSpaceIds();

    expect(res.spaceIds).toEqual(new Set(['*']));
  });

  it('reports truncation when the listing is capped', async () => {
    mockFeatureFlag(true);
    mockGetSettings({ use_space_awareness_migration_status: 'success' });
    mockFind.mockResolvedValue({ saved_objects: [{ id: 'default' }], total: 50000 });

    const res = await getAllSpaceIds();

    expect(res.truncated).toBe(true);
  });
});
