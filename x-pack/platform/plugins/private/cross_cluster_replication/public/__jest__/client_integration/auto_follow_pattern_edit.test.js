/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, act } from '@testing-library/react';
import './mocks';
import { setupEnvironment, pageHelpers } from './helpers';
import { AUTO_FOLLOW_PATTERN_EDIT, AUTO_FOLLOW_PATTERN_EDIT_NAME } from './helpers/constants';

const { setup } = pageHelpers.autoFollowPatternEdit;

describe('Edit Auto-follow pattern', () => {
  let httpRequestsMockHelpers;
  let user;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers } = setupEnvironment());
    httpRequestsMockHelpers.setGetAutoFollowPatternResponse(
      AUTO_FOLLOW_PATTERN_EDIT_NAME,
      AUTO_FOLLOW_PATTERN_EDIT
    );
  });

  describe('on component mount', () => {
    const remoteClusters = [
      { name: 'cluster-1', seeds: ['localhost:123'], isConnected: true },
      { name: 'cluster-2', seeds: ['localhost:123'], isConnected: true },
    ];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
      ({ user } = setup());
      // Advance timers to resolve HTTP mocks (required with fake timers)
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    /**
     * As the "edit" auto-follow pattern component uses the same form underneath that
     * the "create" auto-follow pattern, we won't test it again but simply make sure that
     * the form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<AutoFollowPatternAdd />" component', () => {
      // Verify the form renders with the expected test subject
      expect(screen.getByTestId('autoFollowPatternForm')).toBeInTheDocument();
    });

    test('should populate the form fields with the values from the auto-follow pattern loaded', () => {
      // Form should be populated after mount completes
      expect(screen.getByTestId('nameInput')).toHaveValue(AUTO_FOLLOW_PATTERN_EDIT.name);

      expect(screen.getByTestId('remoteClusterInput')).toHaveValue(
        AUTO_FOLLOW_PATTERN_EDIT.remoteCluster
      );

      const indexPatternInput = screen.getByTestId('indexPatternInput');
      expect(indexPatternInput.textContent).toBe(
        AUTO_FOLLOW_PATTERN_EDIT.leaderIndexPatterns.join('')
      );

      expect(screen.getByTestId('prefixInput')).toHaveValue('prefix_');
      expect(screen.getByTestId('suffixInput')).toHaveValue('_suffix');
    });
  });

  describe('when the remote cluster is disconnected', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([
        { name: 'cluster-2', seeds: ['localhost:123'], isConnected: false },
      ]);
      ({ user } = setup());
      // Advance timers once to resolve HTTP mocks
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should display an error and have a button to edit the remote cluster', () => {
      const error = screen.getByTestId('notConnectedError');
      expect(error).toBeInTheDocument();

      const title = error.querySelector('.euiCallOutHeader__title');
      expect(title.textContent).toBe(
        `Can't edit auto-follow pattern because remote cluster '${AUTO_FOLLOW_PATTERN_EDIT.remoteCluster}' is not connected`
      );

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
