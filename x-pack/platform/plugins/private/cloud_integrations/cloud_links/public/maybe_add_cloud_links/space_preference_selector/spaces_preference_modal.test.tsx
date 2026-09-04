/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserProfileData } from '@kbn/user-profile-components';
import { SpacesPreferencesModal } from './spaces_preference_modal';

describe('SpacesPreferencesModal', () => {
  const closeModal = jest.fn();
  let updateUserProfile: jest.Mock;

  const renderModal = (userProfile: UserProfileData = { userSettings: {} }) =>
    render(
      <SpacesPreferencesModal
        closeModal={closeModal}
        userProfile={userProfile}
        updateUserProfile={updateUserProfile}
      />
    );

  const getRememberSelectedSpaceSwitch = () => screen.getByRole('switch');

  beforeEach(() => {
    jest.clearAllMocks();
    updateUserProfile = jest.fn().mockResolvedValue({});
  });

  it('renders the modal with the remember last selected space switch', () => {
    renderModal();

    expect(screen.getByText('Spaces preferences')).toBeInTheDocument();
    expect(screen.getByText('Remember last selected space')).toBeInTheDocument();
    expect(
      screen.getByText('Kibana will open the last accessed space when logging in.')
    ).toBeInTheDocument();
  });

  it('reflects the persisted preference in the switch state', () => {
    renderModal({ userSettings: { rememberSelectedSpace: true } });

    expect(getRememberSelectedSpaceSwitch()).toBeChecked();
  });

  it('defaults the switch to off when the user has no persisted preference', () => {
    renderModal({});

    expect(getRememberSelectedSpaceSwitch()).not.toBeChecked();
  });

  it('persists the new preference and closes the modal when saving', async () => {
    renderModal({ userSettings: { rememberSelectedSpace: false } });

    await userEvent.click(getRememberSelectedSpaceSwitch());
    expect(getRememberSelectedSpaceSwitch()).toBeChecked();

    await userEvent.click(screen.getByTestId('spacesPreferencesModalSaveButton'));

    expect(updateUserProfile).toHaveBeenCalledWith({
      userSettings: { rememberSelectedSpace: true },
    });
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
  });

  it('disables the save button when the form has not been changed', () => {
    renderModal({ userSettings: { rememberSelectedSpace: true } });

    expect(screen.getByTestId('spacesPreferencesModalSaveButton')).toBeDisabled();
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('keeps the save button disabled when the switch is toggled back to the initial value', async () => {
    const { unmount: unmountInitialOff } = renderModal({
      userSettings: { rememberSelectedSpace: false },
    });

    await userEvent.click(getRememberSelectedSpaceSwitch());
    expect(screen.getByTestId('spacesPreferencesModalSaveButton')).toBeEnabled();

    await userEvent.click(getRememberSelectedSpaceSwitch());
    expect(screen.getByTestId('spacesPreferencesModalSaveButton')).toBeDisabled();
    expect(updateUserProfile).not.toHaveBeenCalled();

    unmountInitialOff();

    renderModal({ userSettings: { rememberSelectedSpace: true } });

    await userEvent.click(getRememberSelectedSpaceSwitch());
    expect(screen.getByTestId('spacesPreferencesModalSaveButton')).toBeEnabled();
    await userEvent.click(getRememberSelectedSpaceSwitch());
    expect(screen.getByTestId('spacesPreferencesModalSaveButton')).toBeDisabled();
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('disables the save button while the update is in flight', async () => {
    let resolveUpdate: (value: UserProfileData) => void = () => {};
    updateUserProfile.mockReturnValue(
      new Promise<UserProfileData>((resolve) => {
        resolveUpdate = resolve;
      })
    );

    renderModal({ userSettings: { rememberSelectedSpace: false } });

    await userEvent.click(getRememberSelectedSpaceSwitch());
    await waitFor(() =>
      expect(screen.getByTestId('spacesPreferencesModalSaveButton')).not.toBeDisabled()
    );

    await userEvent.click(screen.getByTestId('spacesPreferencesModalSaveButton'));

    await waitFor(() =>
      expect(screen.getByTestId('spacesPreferencesModalSaveButton')).toBeDisabled()
    );
    expect(closeModal).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpdate({});
    });

    expect(closeModal).toHaveBeenCalled();
  });

  it('discards the change and closes the modal without persisting', async () => {
    renderModal({ userSettings: { rememberSelectedSpace: false } });

    await userEvent.click(getRememberSelectedSpaceSwitch());
    await userEvent.click(screen.getByTestId('spacesPreferencesModalCancelButton'));

    expect(updateUserProfile).not.toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
  });
});
