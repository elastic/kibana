/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, act } from '@testing-library/react';
import './mocks';
import { setupEnvironment, pageHelpers } from './helpers';

const { setup } = pageHelpers.home;

const getSelectedTabText = () => {
  const container = document;
  const selected =
    container.querySelector('button[aria-selected="true"]') ||
    container.querySelector('button.euiTab-isSelected');
  return selected ? (selected.textContent || '').trim() : '';
};

describe('<CrossClusterReplicationHome />', () => {
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
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setLoadFollowerIndicesResponse();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      ({ user } = setup());
      // Wait for initial mount and HTTP request to complete
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should set the correct app title', () => {
      expect(screen.getByTestId('appTitle')).toBeInTheDocument();
      expect(screen.getByTestId('appTitle').textContent).toEqual('Cross-Cluster Replication');
    });

    test('should have 2 tabs to switch between "Follower indices" & "Auto-follow patterns"', () => {
      expect(screen.getByTestId('followerIndicesTab')).toBeInTheDocument();
      expect(screen.getByTestId('followerIndicesTab').textContent).toEqual('Follower indices');

      expect(screen.getByTestId('autoFollowPatternsTab')).toBeInTheDocument();
      expect(screen.getByTestId('autoFollowPatternsTab').textContent).toEqual(
        'Auto-follow patterns'
      );
    });

    test('should set the default selected tab to "Follower indices"', () => {
      expect(getSelectedTabText()).toBe('Follower indices');

      // Verify that either list or empty prompt is rendered
      expect(
        screen.queryByTestId('createFollowerIndexButton') !== null ||
          screen.queryByTestId('followerIndexListTable') !== null
      ).toBe(true);
    });
  });

  describe('section change', () => {
    beforeEach(async () => {
      ({ user } = setup());
      // Wait for initial mount
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should change to auto-follow pattern', async () => {
      httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({ patterns: [] });
      const autoFollowPatternsTab = screen.getByTestId('autoFollowPatternsTab');

      // user.click already advances timers, so no need for manual advancement
      await user.click(autoFollowPatternsTab);

      expect(getSelectedTabText()).toBe('Auto-follow patterns');

      // Verify that either list or empty prompt is rendered
      expect(
        screen.queryByTestId('createAutoFollowPatternButton') !== null ||
          screen.queryByTestId('autoFollowPatternListTable') !== null ||
          screen.queryByTestId('emptyPrompt') !== null
      ).toBe(true);
    });
  });
});
