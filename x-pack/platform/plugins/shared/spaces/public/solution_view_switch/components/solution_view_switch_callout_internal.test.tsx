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

import { SolutionViewSwitchCalloutInternal } from './solution_view_switch_callout_internal';
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

describe('SolutionViewSwitchCalloutInternal', () => {
  const setup = ({ updateSpaceRejects }: { updateSpaceRejects?: Error } = {}) => {
    const user = userEvent.setup();

    const { getStartServices } = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const pluginsStart: PluginsStart = {
      features: featuresPluginMock.createStart(),
    };
    getStartServices.mockResolvedValue([coreStart, pluginsStart, undefined]);

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

    renderWithI18n(
      <SolutionViewSwitchCalloutInternal
        spacesManager={spacesManager}
        getStartServices={getStartServices}
        currentSolution="es"
      />
    );

    return { user, coreStart, spacesManager, setItemSpy };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('switches solution and sets the per-space localStorage flag', async () => {
    const { user, spacesManager, setItemSpy } = setup();

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
  });

  test('toasts on error', async () => {
    const error = new Error('Another error');
    const { user, coreStart } = setup({ updateSpaceRejects: error });

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
});
