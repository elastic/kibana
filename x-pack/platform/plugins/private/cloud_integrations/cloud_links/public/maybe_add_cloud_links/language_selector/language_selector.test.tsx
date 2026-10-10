/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { getAvailableLocales, setAvailableLocales } from '@kbn/i18n';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { useUpdateUserProfile } from '@kbn/user-profile-components';

import { LanguageSelector } from './language_selector';

jest.mock('@kbn/user-profile-components', () => {
  const original = jest.requireActual('@kbn/user-profile-components');
  return {
    ...original,
    useUpdateUserProfile: jest.fn().mockImplementation(() => ({
      userProfileData: { userSettings: {} },
      isLoading: false,
      update: jest.fn(),
      userProfileLoaded: true,
    })),
  };
});

describe('LanguageSelector', () => {
  const closePopover = jest.fn();
  const previousLocales = getAvailableLocales();
  let core: ReturnType<typeof coreMock.createStart>;
  let security: ReturnType<typeof securityMock.createStart>;

  beforeEach(() => {
    core = coreMock.createStart();
    security = securityMock.createStart();
    setAvailableLocales([]);

    (useUpdateUserProfile as jest.Mock).mockImplementation(() => ({
      userProfileData: { userSettings: {} },
      isLoading: false,
      update: jest.fn(),
      userProfileLoaded: true,
    }));
  });

  afterEach(() => {
    setAvailableLocales(previousLocales);
  });

  it('stays available when language selection is disabled', () => {
    const { getByTestId } = render(
      <LanguageSelector core={core} security={security} closePopover={closePopover} />
    );

    expect(getByTestId('languageSelector')).toBeInTheDocument();
  });
});
