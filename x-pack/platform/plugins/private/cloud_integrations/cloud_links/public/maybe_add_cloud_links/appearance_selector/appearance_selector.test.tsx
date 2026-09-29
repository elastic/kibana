/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { useUpdateUserProfile } from '@kbn/user-profile-components';
import { AppearanceSelector } from './appearance_selector';

vi.mock('./appearance_modal', () => {
      const mocked = {
      AppearanceModal: vi.fn().mockImplementation(({ closeModal, uiSettingsClient }) => {
        return (
          <div data-test-subj="appearance-modal">
            <div data-test-subj="color-mode-group" />
            <div data-test-subj="contrast-mode-group" />
            <button data-test-subj="appearanceModalDiscardButton" onClick={closeModal}>
              Discard
            </button>
            <button
              data-test-subj="appearanceModalSaveButton"
              onClick={async () => {
                await uiSettingsClient.set('theme:darkMode', 'dark');
                await uiSettingsClient.set('theme:contrastMode', 'high');
                closeModal();
              }}
            >
              Save changes
            </button>
          </div>
        );
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/user-profile-components', async () => {
  const original = (await vi.importActual('@kbn/user-profile-components'));
  return {
    ...original,
    useUpdateUserProfile: vi.fn().mockImplementation(() => ({
      userProfileData: {
        userSettings: {
          darkMode: 'light',
          contrastMode: 'standard',
        },
      },
      isLoading: false,
      update: vi.fn(),
      userProfileLoaded: true,
    })),
  };
});

describe('AppearanceSelector', () => {
  const closePopover = vi.fn();
  let core: ReturnType<typeof coreMock.createStart>;
  let security: ReturnType<typeof securityMock.createStart>;

  beforeEach(() => {
    core = coreMock.createStart();
    security = securityMock.createStart();

    (useUpdateUserProfile as Mock).mockImplementation(() => ({
      userProfileData: {
        userSettings: {
          darkMode: 'light',
          contrastMode: 'standard',
        },
      },
      isLoading: false,
      update: vi.fn(),
      userProfileLoaded: true,
    }));

    // Mock the openModal to return a ref with proper close method
    core.overlays.openModal.mockImplementation(() => ({
      close: vi.fn(),
      onClose: Promise.resolve(),
    }));
  });

  it('renders correctly and opens the appearance modal', () => {
    const { getByTestId } = render(
      <AppearanceSelector
        core={core}
        security={security}
        closePopover={closePopover}
        isServerless={false}
      />
    );

    const appearanceSelector = getByTestId('appearanceSelector');
    fireEvent.click(appearanceSelector);

    expect(core.overlays.openModal).toHaveBeenCalled();
    expect(closePopover).toHaveBeenCalled();
  });

  it('does not render when appearance is not visible', () => {
    (useUpdateUserProfile as Mock).mockImplementation(() => ({
      userProfileData: null,
      isLoading: false,
      update: vi.fn(),
      userProfileLoaded: true,
    }));

    const { queryByTestId } = render(
      <AppearanceSelector
        core={core}
        security={security}
        closePopover={closePopover}
        isServerless={false}
      />
    );

    expect(queryByTestId('appearanceSelector')).toBeNull();
  });
});
