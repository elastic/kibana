/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, act, fireEvent } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { API_BASE_PATH } from '../../../common/constants';
import './mocks';
import { FOLLOWER_INDEX_EDIT, FOLLOWER_INDEX_EDIT_NAME } from './helpers/constants';
import { setupEnvironment, pageHelpers } from './helpers';

const { setup } = pageHelpers.followerIndexEdit;

type SetupEnvironmentReturn = ReturnType<typeof setupEnvironment>;

describe('Edit follower index', () => {
  let httpSetup: SetupEnvironmentReturn['httpSetup'];
  let httpRequestsMockHelpers: SetupEnvironmentReturn['httpRequestsMockHelpers'];
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('on component mount', () => {
    const remoteClusters = [{ name: 'new-york', seeds: ['localhost:123'], isConnected: true }];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
      httpRequestsMockHelpers.setGetFollowerIndexResponse(
        FOLLOWER_INDEX_EDIT_NAME,
        FOLLOWER_INDEX_EDIT
      );
      const result = setup();
      user = result.user;

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should use the same Form component as the "<FollowerIndexAdd />" component', () => {
      expect(screen.getByTestId('followerIndexForm')).toBeInTheDocument();
    });

    test('should populate the form fields with the values from the follower index loaded', () => {
      expect(screen.getByTestId('followerIndexInput')).toHaveValue(FOLLOWER_INDEX_EDIT.name);
      expect(screen.getByTestId('leaderIndexInput')).toHaveValue(FOLLOWER_INDEX_EDIT.leaderIndex);
      expect(screen.getByTestId('remoteClusterInput')).toHaveValue(
        FOLLOWER_INDEX_EDIT.remoteCluster
      );
    });
  });

  describe('API', () => {
    const remoteClusters = [{ name: 'new-york', seeds: ['localhost:123'], isConnected: true }];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
      httpRequestsMockHelpers.setGetFollowerIndexResponse(
        FOLLOWER_INDEX_EDIT_NAME,
        FOLLOWER_INDEX_EDIT
      );
      const result = setup();
      user = result.user;

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    // long test takes a while on CI
    // Using fireEvent for better performance on CI
    test('is consumed correctly', async () => {
      // Verify GET was called during mount
      const getCalls = httpSetup.get.mock.calls;
      const getFollowerCall = getCalls.find(
        (call: unknown[]) =>
          call[0] === `${API_BASE_PATH}/follower_indices/${FOLLOWER_INDEX_EDIT_NAME}`
      );
      expect(getFollowerCall).toBeDefined();

      // Change a form value to enable save
      const maxRetryDelayInput = screen.getByTestId('maxRetryDelayInput');
      fireEvent.change(maxRetryDelayInput, { target: { value: '10s' } });
      fireEvent.blur(maxRetryDelayInput);

      // Click save button
      const saveButton = screen.getByTestId('submitButton');
      fireEvent.click(saveButton);

      // Confirmation modal should appear, click confirm
      const confirmButton = await screen.findByTestId('confirmModalConfirmButton');
      fireEvent.click(confirmButton);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // PUT should have been called
      expect(httpSetup.put).toHaveBeenCalledWith(
        `${API_BASE_PATH}/follower_indices/${FOLLOWER_INDEX_EDIT_NAME}`,
        expect.objectContaining({
          body: expect.stringContaining('"maxRetryDelay":"10s"'),
        })
      );
    });

    // The follower index edit backend route (and likewise the create route)
    // validates the body with `schema.object({...}).unknowns: 'forbid'`. The
    // loaded `FollowerIndex` shape includes the read-only server-only fields
    // `status` and `shards`; if the form forwards them on save, the server
    // will 400 the request. The PUT body must never contain those fields
    // regardless of what the GET response looked like.
    test('should not forward read-only fields (status, shards) in the PUT body', async () => {
      const maxRetryDelayInput = screen.getByTestId('maxRetryDelayInput');
      fireEvent.change(maxRetryDelayInput, { target: { value: '10s' } });
      fireEvent.blur(maxRetryDelayInput);

      const saveButton = screen.getByTestId('submitButton');
      fireEvent.click(saveButton);

      const confirmButton = await screen.findByTestId('confirmModalConfirmButton');
      fireEvent.click(confirmButton);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      const putEndpoint = `${API_BASE_PATH}/follower_indices/${FOLLOWER_INDEX_EDIT_NAME}`;
      type PutCall = [string | { path: string }, { body?: string } | undefined];
      const putCalls = httpSetup.put.mock.calls as unknown as PutCall[];
      const putCall = putCalls.find(([path]) => {
        const resolved = typeof path === 'string' ? path : path.path;
        return resolved === putEndpoint;
      });
      expect(putCall).toBeDefined();
      const [, options] = putCall!;
      const rawBody = options?.body;
      expect(typeof rawBody).toBe('string');
      const body = JSON.parse(rawBody as string);

      expect(body).not.toHaveProperty('status');
      expect(body).not.toHaveProperty('shards');
      // And the save must still include the advanced setting the user changed,
      // guarding against the flip side — accidentally stripping too much.
      expect(body).toHaveProperty('maxRetryDelay', '10s');
    });
  });

  describe('when the remote cluster is disconnected', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([
        { name: 'new-york', seeds: ['localhost:123'], isConnected: false },
      ]);
      httpRequestsMockHelpers.setGetFollowerIndexResponse(
        FOLLOWER_INDEX_EDIT_NAME,
        FOLLOWER_INDEX_EDIT
      );
      ({ user } = setup());

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should display an error and have a button to edit the remote cluster', () => {
      const error = screen.getByTestId('notConnectedError');
      expect(error).toBeInTheDocument();

      const editButton = within(error).getByTestId('editButton');
      expect(editButton).toBeInTheDocument();
    });

    test('should prevent saving the form and display an error message for the required remote cluster', async () => {
      const submitButton = screen.getByTestId('submitButton');
      await user.click(submitButton);

      const errors = screen.queryAllByText('A connected remote cluster is required.');
      expect(errors.length).toBeGreaterThan(0);

      expect(submitButton).toBeDisabled();
    });
  });
});
