/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { InitialSolutionSetup } from './initial_solution_setup';
import { ENTER_SPACE_PATH } from '../../../common';
import { spacesManagerMock } from '../../spaces_manager/mocks';

const createHttpFetchError = (message: string, status: number) =>
  Object.assign(new Error(message), {
    request: {} as Request,
    response: { status },
  });

describe('InitialSolutionSetup', () => {
  const originalLocation = window.location;
  let hrefSpy: jest.Mock;
  const serverBasePath = '/server-base-path';

  beforeEach(() => {
    hrefSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, search: '', reload: jest.fn() },
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      set: hrefSpy,
      get: () => '',
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  const renderSetup = (spacesManager = spacesManagerMock.create()) => {
    renderWithI18n(
      <InitialSolutionSetup spacesManager={spacesManager} serverBasePath={serverBasePath} />
    );
    return spacesManager;
  };

  it('continues to space preserving next after successful completion', async () => {
    Object.defineProperty(window.location, 'search', {
      configurable: true,
      value: '?next=%2Fapp%2Fhome',
    });
    const user = userEvent.setup();
    const spacesManager = spacesManagerMock.create();
    spacesManager.completeInitialSolutionSetup = jest.fn().mockResolvedValue(undefined);

    renderSetup(spacesManager);
    await user.click(screen.getByRole('button', { name: 'Select Elasticsearch' }));

    await waitFor(() => {
      expect(spacesManager.completeInitialSolutionSetup).toHaveBeenCalledWith('es');
      expect(hrefSpy).toHaveBeenCalledWith(
        `${serverBasePath}${ENTER_SPACE_PATH}?next=${encodeURIComponent('/app/home')}`
      );
    });
  });

  it('continues to space on recoverable 409 when setup is no longer required', async () => {
    const user = userEvent.setup();
    const spacesManager = spacesManagerMock.create();
    const conflictError = createHttpFetchError('Already completed', 409);
    spacesManager.completeInitialSolutionSetup = jest.fn().mockRejectedValue(conflictError);
    spacesManager.getInitialSolutionSetup = jest.fn().mockResolvedValue({ required: false });

    renderSetup(spacesManager);
    await user.click(screen.getByRole('button', { name: 'Select Elasticsearch' }));

    await waitFor(() => {
      expect(spacesManager.getInitialSolutionSetup).toHaveBeenCalledTimes(1);
      expect(hrefSpy).toHaveBeenCalledWith(`${serverBasePath}${ENTER_SPACE_PATH}`);
    });
    expect(screen.queryByTestId('initialSolutionSetupError')).not.toBeInTheDocument();
  });

  it('shows error on unrecoverable 409 when setup is still required', async () => {
    const user = userEvent.setup();
    const spacesManager = spacesManagerMock.create();
    const conflictError = createHttpFetchError('Setup conflict', 409);
    spacesManager.completeInitialSolutionSetup = jest.fn().mockRejectedValue(conflictError);
    spacesManager.getInitialSolutionSetup = jest.fn().mockResolvedValue({ required: true });

    renderSetup(spacesManager);
    await user.click(screen.getByRole('button', { name: 'Select Elasticsearch' }));

    expect(await screen.findByTestId('initialSolutionSetupError')).toHaveTextContent(
      'Setup conflict'
    );
    expect(hrefSpy).not.toHaveBeenCalled();
  });
});
