/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';

import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { i18n, setAvailableLocales } from '@kbn/i18n';

import { usePrimeUserLocale } from './use_prime_user_locale';
import { UserProfileAPIClient } from './user_profile_api_client';
import { UserAPIClient } from '../../management';
import { securityMock } from '../../mocks';
import { Providers } from '../account_management_app';

describe('usePrimeUserLocale', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let history: ReturnType<typeof scopedHistoryMock.create>;
  let authc: ReturnType<typeof securityMock.createSetup>['authc'];
  let userProfiles: UserProfileAPIClient;
  let wrapper: FC<PropsWithChildren<unknown>>;

  beforeEach(() => {
    coreStart = coreMock.createStart();
    coreStart.http.post.mockResolvedValue(undefined);
    history = scopedHistoryMock.create();
    authc = securityMock.createSetup().authc;
    userProfiles = new UserProfileAPIClient(coreStart.http);

    wrapper = ({ children }) => (
      <Providers
        services={coreStart}
        history={history}
        authc={authc}
        securityApiClients={{
          userProfiles,
          users: new UserAPIClient(coreStart.http),
        }}
      >
        {children}
      </Providers>
    );

    // Default: i18n.getLocale returns lowercased config locale.
    jest.spyOn(i18n, 'getLocale').mockReturnValue('fr-fr');

    // Picker enabled with the five bundled locales — matches the schema default.
    setAvailableLocales([
      { id: 'en', label: 'English' },
      { id: 'fr-FR', label: 'Français' },
      { id: 'ja-JP', label: '日本語' },
      { id: 'zh-CN', label: '中文' },
      { id: 'de-DE', label: 'Deutsch' },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setAvailableLocales([]);
  });

  it('does nothing while the user profile has not finished loading', async () => {
    // Don't call getCurrent — userProfileLoaded$ stays false.
    renderHook(() => usePrimeUserLocale(), { wrapper });

    // Allow any microtasks to flush.
    await Promise.resolve();

    expect(coreStart.http.post).not.toHaveBeenCalledWith(
      '/internal/security/user_profile/_data',
      expect.anything()
    );
  });

  it('does nothing when the user already has a saved locale', async () => {
    coreStart.http.get.mockResolvedValue({
      data: { userSettings: { locale: 'fr-FR' } },
    });
    await userProfiles.getCurrent({ dataPath: 'userSettings' });

    renderHook(() => usePrimeUserLocale(), { wrapper });

    await Promise.resolve();

    expect(coreStart.http.post).not.toHaveBeenCalledWith(
      '/internal/security/user_profile/_data',
      expect.anything()
    );
  });

  it('primes the profile with the canonical config locale when no locale is saved', async () => {
    coreStart.http.get.mockResolvedValue({
      data: { userSettings: {} },
    });
    await userProfiles.getCurrent({ dataPath: 'userSettings' });

    renderHook(() => usePrimeUserLocale(), { wrapper });

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenCalledWith(
        '/internal/security/user_profile/_data',
        expect.objectContaining({
          // getLocale() returns lowercased 'fr-fr'; hook should save canonical 'fr-FR'.
          body: expect.stringContaining('"locale":"fr-FR"'),
        })
      );
    });
  });

  it('only fires the prime save once even across re-renders', async () => {
    coreStart.http.get.mockResolvedValue({ data: { userSettings: {} } });
    await userProfiles.getCurrent({ dataPath: 'userSettings' });

    const { rerender } = renderHook(() => usePrimeUserLocale(), { wrapper });

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenCalledTimes(1);
    });

    rerender();
    rerender();
    await Promise.resolve();

    expect(coreStart.http.post).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no locales are configured (i18n.locales: [])', async () => {
    setAvailableLocales([]);
    coreStart.http.get.mockResolvedValue({ data: { userSettings: {} } });
    await userProfiles.getCurrent({ dataPath: 'userSettings' });

    renderHook(() => usePrimeUserLocale(), { wrapper });

    await Promise.resolve();

    expect(coreStart.http.post).not.toHaveBeenCalledWith(
      '/internal/security/user_profile/_data',
      expect.anything()
    );
  });

  it('does not show a success notification for the silent save', async () => {
    coreStart.http.get.mockResolvedValue({ data: { userSettings: {} } });
    await userProfiles.getCurrent({ dataPath: 'userSettings' });

    renderHook(() => usePrimeUserLocale(), { wrapper });

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenCalled();
    });

    expect(coreStart.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
