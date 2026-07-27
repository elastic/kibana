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
import { SpacesConfigurationModal } from './spaces_configuration_modal';

describe('SpacesConfigurationModal', () => {
  const closeModal = jest.fn();
  let updateUserProfile: jest.Mock;

  const renderModal = (userProfile: UserProfileData = { userSettings: {} }) =>
    render(
      <SpacesConfigurationModal
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

    expect(screen.getByText('Spaces Configuration')).toBeInTheDocument();
    expect(screen.getByText('Remember last selected space')).toBeInTheDocument();
    expect(
      screen.getByText('Kibana will redirect to last accessed space on login.')
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

    await userEvent.click(screen.getByTestId('spacesConfigurationModalSaveButton'));

    expect(updateUserProfile).toHaveBeenCalledWith({
      userSettings: { rememberSelectedSpace: true },
    });
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
  });

  it('persists the unchanged preference when saving without toggling the switch', async () => {
    renderModal({ userSettings: { rememberSelectedSpace: true } });

    await userEvent.click(screen.getByTestId('spacesConfigurationModalSaveButton'));

    expect(updateUserProfile).toHaveBeenCalledWith({
      userSettings: { rememberSelectedSpace: true },
    });
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
  });

  it('disables the save button while the update is in flight', async () => {
    let resolveUpdate: (value: UserProfileData) => void = () => {};
    updateUserProfile.mockReturnValue(
      new Promise<UserProfileData>((resolve) => {
        resolveUpdate = resolve;
      })
    );

    renderModal({ userSettings: { rememberSelectedSpace: false } });

    await userEvent.click(screen.getByTestId('spacesConfigurationModalSaveButton'));

    await waitFor(() =>
      expect(screen.getByTestId('spacesConfigurationModalSaveButton')).toBeDisabled()
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
    await userEvent.click(screen.getByTestId('spacesConfigurationModalDiscardButton'));

    expect(updateUserProfile).not.toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
  });
});
