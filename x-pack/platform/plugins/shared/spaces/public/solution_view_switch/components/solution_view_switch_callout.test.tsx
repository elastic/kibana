/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { getSolutionViewSwitchCalloutComponent } from './solution_view_switch_callout';
import { addSpaceIdToPath, ENTER_SPACE_PATH } from '../../../common';
import type { PluginsStart } from '../../plugin';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX } from '../constants';
import type { SupportedSolutionView } from '../types';

jest.mock('./modal', () => ({
  SolutionViewSwitchModal: ({
    onSwitch,
    onClose,
    isLoading,
  }: {
    onSwitch: (solution: SupportedSolutionView) => void;
    onClose: () => void;
    isLoading: boolean;
  }) => (
    <div>
      <button type="button" onClick={() => onSwitch('oblt')} disabled={isLoading}>
        Mock switch
      </button>
      <button type="button" onClick={onClose}>
        Mock close
      </button>
    </div>
  ),
}));

describe('SolutionViewSwitchCallout', () => {
  const originalLocation = window.location;
  let hrefSpy: jest.Mock;

  beforeEach(() => {
    hrefSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: jest.fn() },
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      set: hrefSpy,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    localStorage.clear();
    jest.restoreAllMocks();
  });

  const setup = async ({ updateSpaceRejects }: { updateSpaceRejects?: Error } = {}) => {
    const user = userEvent.setup();

    const { getStartServices } = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const pluginsStart: PluginsStart = { features: featuresPluginMock.createStart() };

    getStartServices.mockResolvedValue([coreStart, pluginsStart, undefined]);

    const getUrlForAppSpy = jest
      .spyOn(coreStart.application, 'getUrlForApp')
      .mockReturnValue('app/management/kibana/spaces');

    const spacesManager = spacesManagerMock.create();
    spacesManager.getActiveSpace.mockResolvedValue({
      id: 'default',
      name: 'Default',
      disabledFeatures: [],
    });

    if (updateSpaceRejects) {
      spacesManager.updateSpace.mockRejectedValue(updateSpaceRejects);
    } else {
      spacesManager.updateSpace.mockResolvedValue(undefined);
    }

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    const SolutionViewSwitchCalloutComponent = await getSolutionViewSwitchCalloutComponent({
      spacesManager,
      getStartServices,
    });

    renderWithI18n(<SolutionViewSwitchCalloutComponent currentSolution="es" />);

    return { user, coreStart, spacesManager, setItemSpy, getUrlForAppSpy };
  };

  test('updates space, sets localStorage and navigates to space home page on success', async () => {
    const { user, spacesManager, setItemSpy, getUrlForAppSpy } = await setup();

    expect(getUrlForAppSpy).toHaveBeenCalledWith('management', { path: 'kibana/spaces' });

    await user.click(screen.getByRole('button', { name: /learn more/i }));
    await user.click(screen.getByRole('button', { name: /mock switch/i }));

    await waitFor(() => {
      expect(spacesManager.getActiveSpace).toHaveBeenCalledTimes(1);
      expect(spacesManager.updateSpace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default',
          solution: 'oblt',
        })
      );
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      `${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:default`,
      'true'
    );
    expect(hrefSpy).toHaveBeenCalledWith(addSpaceIdToPath('', 'default', ENTER_SPACE_PATH));
  });

  test('shows error toast on update failure', async () => {
    const error = new Error('Another error');
    const { user, coreStart } = await setup({ updateSpaceRejects: error });

    await user.click(screen.getByRole('button', { name: /learn more/i }));
    await user.click(screen.getByRole('button', { name: /mock switch/i }));

    await waitFor(() => {
      expect(coreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          title: expect.stringContaining('Error switching solution view'),
        })
      );
    });
  });

  test('does not render when previously dismissed', async () => {
    jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation((key) =>
        key === `${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}.dismissed` ? 'true' : null
      );

    await setup();

    expect(screen.queryByTestId('solutionViewSwitchCalloutDismissButton')).not.toBeInTheDocument();
  });

  test('renders when not previously dismissed', async () => {
    await setup();

    expect(screen.getByTestId('solutionViewSwitchCalloutDismissButton')).toBeInTheDocument();
  });

  test('dismiss button hides callout and sets localStorage flag', async () => {
    const { user, setItemSpy } = await setup();

    expect(screen.getByTestId('solutionViewSwitchCalloutDismissButton')).toBeInTheDocument();

    await user.click(screen.getByTestId('solutionViewSwitchCalloutDismissButton'));

    expect(screen.queryByTestId('solutionViewSwitchCalloutDismissButton')).not.toBeInTheDocument();
    expect(setItemSpy).toHaveBeenCalledWith(
      `${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}.dismissed`,
      'true'
    );
  });
});
