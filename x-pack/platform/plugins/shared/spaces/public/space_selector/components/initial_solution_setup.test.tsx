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
  const serverBasePath = '/server-base-path';

  beforeAll(() => {
    // @ts-expect-error override window.location for navigation assertions
    delete window.location;
    // @ts-expect-error partial Location mock
    window.location = { href: 'http://localhost/spaces/space_selector' };
  });

  afterAll(() => {
    // @ts-expect-error restore window.location
    window.location = originalLocation;
  });

  beforeEach(() => {
    window.location.href = 'http://localhost/spaces/space_selector';
    jest.clearAllMocks();
  });

  const renderSetup = (spacesManager = spacesManagerMock.create()) => {
    renderWithI18n(
      <InitialSolutionSetup spacesManager={spacesManager} serverBasePath={serverBasePath} />
    );
    return spacesManager;
  };

  it('continues to space preserving next after successful completion', async () => {
    window.location.href = `http://localhost/spaces/space_selector?next=${encodeURIComponent(
      '/app/home'
    )}`;
    const user = userEvent.setup();
    const spacesManager = spacesManagerMock.create();
    spacesManager.completeInitialSolutionSetup = jest.fn().mockResolvedValue(undefined);

    renderSetup(spacesManager);
    await user.click(screen.getByRole('button', { name: 'Select Elasticsearch' }));

    await waitFor(() => {
      expect(spacesManager.completeInitialSolutionSetup).toHaveBeenCalledWith('es');
      expect(window.location.href).toBe(
        `${serverBasePath}${ENTER_SPACE_PATH}?next=${encodeURIComponent('/app/home')}`
      );
    });
  });

  it('preserves hash fragments from the current page when forwarding next', async () => {
    window.location.href = `http://localhost/spaces/space_selector?next=${encodeURIComponent(
      '/app/home'
    )}#/discover/foo`;
    const user = userEvent.setup();
    const spacesManager = spacesManagerMock.create();
    spacesManager.completeInitialSolutionSetup = jest.fn().mockResolvedValue(undefined);

    renderSetup(spacesManager);
    await user.click(screen.getByRole('button', { name: 'Select Elasticsearch' }));

    await waitFor(() => {
      expect(window.location.href).toBe(
        `${serverBasePath}${ENTER_SPACE_PATH}?next=${encodeURIComponent('/app/home#/discover/foo')}`
      );
    });
  });

  it('omits next when the continuation URL is external', async () => {
    window.location.href = `http://localhost/spaces/space_selector?next=${encodeURIComponent(
      'https://evil.com'
    )}`;
    const user = userEvent.setup();
    const spacesManager = spacesManagerMock.create();
    spacesManager.completeInitialSolutionSetup = jest.fn().mockResolvedValue(undefined);

    renderSetup(spacesManager);
    await user.click(screen.getByRole('button', { name: 'Select Elasticsearch' }));

    await waitFor(() => {
      expect(window.location.href).toBe(`${serverBasePath}${ENTER_SPACE_PATH}`);
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
      expect(window.location.href).toBe(`${serverBasePath}${ENTER_SPACE_PATH}`);
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
    expect(window.location.href).toBe('http://localhost/spaces/space_selector');
  });
});
