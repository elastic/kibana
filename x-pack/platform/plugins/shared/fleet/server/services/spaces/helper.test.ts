/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { Settings } from '../../types';
import { appContextService } from '../app_context';
import { getSettingsOrUndefined } from '../settings';

import { isSpaceAwarenessEnabled, isSpaceAwarenessMigrationPending } from './helpers';

vi.mock('../app_context');
vi.mock('../settings');

function mockFeatureFlag(val: boolean) {
  vi.mocked(appContextService.getExperimentalFeatures).mockReturnValue({
    useSpaceAwareness: val,
  } as any);
}

function mockGetSettings(settings?: Partial<Settings>) {
  if (settings) {
    vi.mocked(getSettingsOrUndefined).mockResolvedValue(settings as any);
  } else {
    vi.mocked(getSettingsOrUndefined).mockResolvedValue(undefined);
  }
}

describe('isSpaceAwarenessEnabled', () => {
  beforeEach(() => {
    vi.mocked(appContextService.getExperimentalFeatures).mockReset();
    vi.mocked(getSettingsOrUndefined).mockReset();
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
    vi.mocked(appContextService.getExperimentalFeatures).mockReset();
    vi.mocked(getSettingsOrUndefined).mockReset();
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
