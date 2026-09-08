/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, act, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import './mocks';
import { getFollowerIndexMock } from './fixtures/follower_index';
import { getAutoFollowPatternMock } from './fixtures/auto_follow_pattern';
import { setupEnvironment, pageHelpers } from './helpers';

const { setup } = pageHelpers.home;

type SetupEnvironmentReturn = ReturnType<typeof setupEnvironment>;

const getSelectedTabText = () => {
  const container = document;
  const selected =
    container.querySelector('button[aria-selected="true"]') ||
    container.querySelector('button.euiTab-isSelected');
  return selected ? (selected.textContent || '').trim() : '';
};

describe('<CrossClusterReplicationHome />', () => {
  let httpRequestsMockHelpers: SetupEnvironmentReturn['httpRequestsMockHelpers'];
  let httpSetup: SetupEnvironmentReturn['httpSetup'];
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
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
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
        'Cross-Cluster Replication'
      );
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

    test('should keep the create action in the empty prompt, not the header', () => {
      const emptyPrompt = screen.getByTestId('emptyPrompt');
      expect(within(emptyPrompt).getByTestId('createFollowerIndexButton')).toBeInTheDocument();
    });
  });

  describe('while follower indices are loading', () => {
    beforeEach(() => {
      httpSetup.get.mockImplementation(() => new Promise(() => {}));
      ({ user } = setup());
    });

    test('should keep the app header mounted and hide the header create action', () => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
        'Cross-Cluster Replication'
      );
      expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('createFollowerIndexButton')).not.toBeInTheDocument();
    });
  });

  describe('when there are follower indices', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadFollowerIndicesResponse({
        indices: [getFollowerIndexMock({ name: 'ccr-follower' })],
      });
      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should show create a follower index as the header primary action', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
      expect(screen.getByTestId('createFollowerIndexButton')).toHaveTextContent(
        'Create a follower index'
      );
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

    test('should show create an auto-follow pattern as the header primary action when patterns exist', async () => {
      httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({
        patterns: [getAutoFollowPatternMock({ name: 'ccr-pattern' })],
      });
      await user.click(screen.getByTestId('autoFollowPatternsTab'));

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
      expect(screen.getByTestId('createAutoFollowPatternButton')).toHaveTextContent(
        'Create an auto-follow pattern'
      );
    });
  });
});
