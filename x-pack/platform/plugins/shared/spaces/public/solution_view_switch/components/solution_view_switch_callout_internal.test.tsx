/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { SolutionViewSwitchCalloutInternal } from './solution_view_switch_callout_internal';
import type { SupportedSolutionView } from '../types';

vi.mock('./modal', () => {
      const mocked = {
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
    };
      return { ...mocked, default: mocked };
    });

describe('SolutionViewSwitchCalloutInternal', () => {
  const setup = ({ updateSpaceRejects }: { updateSpaceRejects?: Error } = {}) => {
    const user = userEvent.setup();
    const updateSpace = updateSpaceRejects
      ? vi.fn().mockRejectedValue(updateSpaceRejects)
      : vi.fn().mockResolvedValue(undefined);
    const showError = vi.fn();

    renderWithI18n(
      <SolutionViewSwitchCalloutInternal
        currentSolution="es"
        manageSpacesUrl="app/management/kibana/spaces"
        updateSpace={updateSpace}
        showError={showError}
        onDismiss={vi.fn()}
      />
    );

    return { user, updateSpace, showError };
  };

  test('calls updateSpace when switching', async () => {
    const { user, updateSpace, showError } = setup();

    await user.click(screen.getByRole('button', { name: /learn more/i }));
    await user.click(screen.getByRole('button', { name: /mock switch/i }));

    await waitFor(() => {
      expect(updateSpace).toHaveBeenCalledWith('oblt');
    });
    expect(showError).not.toHaveBeenCalled();
  });

  test('calls showError when updateSpace rejects', async () => {
    const error = new Error('Another error');
    const { user, showError } = setup({ updateSpaceRejects: error });

    await user.click(screen.getByRole('button', { name: /learn more/i }));
    await user.click(screen.getByRole('button', { name: /mock switch/i }));

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith(error);
    });
  });
});
