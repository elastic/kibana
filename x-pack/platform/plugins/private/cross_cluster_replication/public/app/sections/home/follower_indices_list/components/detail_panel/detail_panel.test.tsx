/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactElement } from 'react';
import { render as rtlRender, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getRandomString } from '@kbn/test-jest-helpers';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DetailPanel } from './detail_panel';
import { API_STATUS } from '../../../../../constants';
import type { FollowerIndexWithPausedStatus, Shard } from '../../../../../../../common/types';
import { routing } from '../../../../../services/routing';

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 5000;

// Routing mock
jest.mock('../../../../../services/routing', () => {
  return {
    routing: {
      getFollowerIndexPath: jest.fn(() => '/follower-index-path'),
      navigate: jest.fn(),
      _reactRouter: {
        getUrlForApp: jest.fn(() => '/mock-url'),
      },
    },
  };
});

// getIndexListUri mock
jest.mock('@kbn/index-management-plugin/public', () => ({
  getIndexListUri: jest.fn((filter) => `/index-list?${filter}`),
}));

// ContextMenu mock
jest.mock('../context_menu', () => ({
  ContextMenu: ({ followerIndices, label, testSubj, isPollingStatus }: any) => (
    <div data-test-subj={testSubj}>
      <span>{label}</span>
      <span data-test-subj="contextMenuFollowerIndices">
        {JSON.stringify(followerIndices.map((fi: any) => fi.name))}
      </span>
      <span data-test-subj="contextMenuIsPollingStatus">{String(isPollingStatus)}</span>
    </div>
  ),
}));

// window.location.search mock
const mockLocationSearch = jest.fn();

const render = (ui: ReactElement) => {
  return rtlRender(<IntlProvider locale="en">{ui}</IntlProvider>);
};

const createMockShard = (overrides?: Partial<Shard>): Shard => ({
  id: 0,
  remoteCluster: 'remote-cluster-1',
  leaderIndex: 'leader-index-1',
  leaderGlobalCheckpoint: 1000,
  leaderMaxSequenceNum: 1000,
  followerGlobalCheckpoint: 1000,
  followerMaxSequenceNum: 1000,
  lastRequestedSequenceNum: 1000,
  outstandingReadRequestsCount: 0,
  outstandingWriteRequestsCount: 0,
  writeBufferOperationsCount: 0,
  writeBufferSizeBytes: 0,
  followerMappingVersion: 1,
  followerSettingsVersion: 1,
  totalReadTimeMs: 100,
  totalReadRemoteExecTimeMs: 50,
  successfulReadRequestCount: 10,
  failedReadRequestsCount: 0,
  operationsReadCount: 1000,
  bytesReadCount: 50000,
  totalWriteTimeMs: 100,
  successfulWriteRequestsCount: 10,
  failedWriteRequestsCount: 0,
  operationsWrittenCount: 1000,
  readExceptions: [],
  timeSinceLastReadMs: 1000,
  ...overrides,
});

const createMockFollowerIndex = (
  overrides?: Partial<FollowerIndexWithPausedStatus>
): FollowerIndexWithPausedStatus => ({
  name: getRandomString(),
  remoteCluster: 'remote-cluster-1',
  leaderIndex: 'leader-index-1',
  status: 'Active',
  isPaused: false,
  maxReadRequestOperationCount: 5120,
  maxOutstandingReadRequests: 12,
  maxReadRequestSize: '32mb',
  maxWriteRequestOperationCount: 5120,
  maxWriteRequestSize: '9223372036854775807b',
  maxOutstandingWriteRequests: 9,
  maxWriteBufferCount: 2147483647,
  maxWriteBufferSize: '512mb',
  maxRetryDelay: '500ms',
  readPollTimeout: '1m',
  shards: [createMockShard()],
  ...overrides,
});

const defaultProps = {
  followerIndexId: 'test-follower-index',
  followerIndex: createMockFollowerIndex({ name: 'test-follower-index' }),
  apiStatus: API_STATUS.IDLE,
  closeDetailPanel: jest.fn(),
  getFollowerIndex: jest.fn(),
};

describe('DetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (routing.navigate as jest.Mock).mockClear();

    mockLocationSearch.mockReturnValue('');
    Object.defineProperty(window, 'location', {
      value: {
        get search() {
          return mockLocationSearch();
        },
      },
      writable: true,
      configurable: true,
    });
  });

  describe('Component states', () => {
    it('should render loading state when API status is loading', () => {
      render(
        <DetailPanel {...defaultProps} apiStatus={API_STATUS.LOADING} followerIndex={undefined} />
      );

      expect(screen.getByText('Loading follower index…')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render not found state when follower index is undefined', () => {
      render(
        <DetailPanel {...defaultProps} followerIndex={undefined} apiStatus={API_STATUS.IDLE} />
      );

      expect(screen.getByText('Follower index not found')).toBeInTheDocument();
    });
  });

  describe('Flyout structure', () => {
    it('should render the flyout with correct title', () => {
      render(<DetailPanel {...defaultProps} />);

      expect(screen.getByTestId('followerIndexDetail')).toBeInTheDocument();
      expect(screen.getByTestId('title')).toHaveTextContent('test-follower-index');
    });

    it('should call closeDetailPanel when flyout is closed', async () => {
      const closeDetailPanel = jest.fn();
      const user = userEvent.setup();

      render(<DetailPanel {...defaultProps} closeDetailPanel={closeDetailPanel} />);

      const closeButton = screen.getByLabelText(/close this dialog/i);
      await user.click(closeButton);

      expect(closeDetailPanel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Active follower index', () => {
    const activeFollowerIndex = createMockFollowerIndex({
      name: 'active-index',
      isPaused: false,
      status: 'Active',
      remoteCluster: 'remote-cluster-test',
      leaderIndex: 'leader-index-test',
    });

    it('should display active index information correctly', () => {
      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="active-index"
          followerIndex={activeFollowerIndex}
        />
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Active');
      expect(screen.getByTestId('remoteCluster')).toHaveTextContent('remote-cluster-test');
      expect(screen.getByTestId('leaderIndex')).toHaveTextContent('leader-index-test');
    });

    it('should display settings section with all configuration values', () => {
      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="active-index"
          followerIndex={activeFollowerIndex}
        />
      );

      const settingsSection = screen.getByTestId('settingsSection');
      expect(within(settingsSection).getByText('Settings')).toBeInTheDocument();

      // Verify all 10 settings are displayed
      expect(screen.getByTestId('maxReadReqOpCount')).toHaveTextContent(
        activeFollowerIndex.maxReadRequestOperationCount!.toString()
      );
      expect(screen.getByTestId('maxOutstandingReadReq')).toHaveTextContent(
        activeFollowerIndex.maxOutstandingReadRequests!.toString()
      );
      expect(screen.getByTestId('maxReadReqSize')).toHaveTextContent(
        activeFollowerIndex.maxReadRequestSize!
      );
      expect(screen.getByTestId('maxWriteReqOpCount')).toHaveTextContent(
        activeFollowerIndex.maxWriteRequestOperationCount!.toString()
      );
      expect(screen.getByTestId('maxWriteReqSize')).toHaveTextContent(
        activeFollowerIndex.maxWriteRequestSize!
      );
      expect(screen.getByTestId('maxOutstandingWriteReq')).toHaveTextContent(
        activeFollowerIndex.maxOutstandingWriteRequests!.toString()
      );
      expect(screen.getByTestId('maxWriteBufferCount')).toHaveTextContent(
        activeFollowerIndex.maxWriteBufferCount!.toString()
      );
      expect(screen.getByTestId('maxWriteBufferSize')).toHaveTextContent(
        activeFollowerIndex.maxWriteBufferSize!
      );
      expect(screen.getByTestId('maxRetryDelay')).toHaveTextContent(
        activeFollowerIndex.maxRetryDelay!
      );
      expect(screen.getByTestId('readPollTimeout')).toHaveTextContent(
        activeFollowerIndex.readPollTimeout!
      );

      const settingsValues = screen.getAllByTestId('settingsValues');
      expect(settingsValues).toHaveLength(10);
    });
  });

  describe('Paused follower index', () => {
    it('should display paused state correctly without settings or shard stats', () => {
      const pausedFollowerIndex = createMockFollowerIndex({
        name: 'paused-index',
        isPaused: true,
        status: 'Paused',
        shards: undefined,
      });

      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="paused-index"
          followerIndex={pausedFollowerIndex}
        />
      );

      // Verify paused status
      expect(screen.getByTestId('status')).toHaveTextContent('Paused');

      // Verify settings are not displayed
      expect(screen.queryByTestId('maxReadReqOpCount')).not.toBeInTheDocument();
      expect(screen.queryByTestId('maxOutstandingReadReq')).not.toBeInTheDocument();

      // Verify callout message
      const settingsSection = screen.getByTestId('settingsSection');
      expect(
        within(settingsSection).getByText(
          /paused follower index does not have settings or shard statistics/i
        )
      ).toBeInTheDocument();

      // Verify shard statistics are not displayed
      const shardsStatsSection = screen.getByTestId('shardsStatsSection');
      expect(within(shardsStatsSection).queryByTestId('shardsStats')).not.toBeInTheDocument();
    });
  });

  describe('Shard statistics', () => {
    it('should render shard statistics for active index with single shard', () => {
      const followerIndex = createMockFollowerIndex({
        isPaused: false,
        shards: [createMockShard({ id: 0, leaderGlobalCheckpoint: 500 })],
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      expect(screen.getByText('Shard 0 stats')).toBeInTheDocument();

      const shardsStats = screen.getByTestId('shardsStats');
      const shardData = JSON.parse(shardsStats.textContent || '{}');
      expect(shardData.id).toBe(0);
      expect(shardData.leaderGlobalCheckpoint).toBe(500);
    });

    it('should render shard statistics for multiple shards', () => {
      const followerIndex = createMockFollowerIndex({
        isPaused: false,
        shards: [
          createMockShard({ id: 0, leaderGlobalCheckpoint: 500 }),
          createMockShard({ id: 1, leaderGlobalCheckpoint: 600 }),
        ],
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      expect(screen.getByText('Shard 0 stats')).toBeInTheDocument();
      expect(screen.getByText('Shard 1 stats')).toBeInTheDocument();

      const shardsStats = screen.getAllByTestId('shardsStats');
      expect(shardsStats).toHaveLength(2);

      const shard0Data = JSON.parse(shardsStats[0].textContent || '{}');
      expect(shard0Data.id).toBe(0);

      const shard1Data = JSON.parse(shardsStats[1].textContent || '{}');
      expect(shard1Data.id).toBe(1);
    });

    it('should not render shard statistics when shards are missing or empty', () => {
      const testCases: Array<undefined | any[]> = [undefined, []];

      testCases.forEach((shards) => {
        const followerIndex = createMockFollowerIndex({
          isPaused: false,
          shards,
        });

        const { unmount } = render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

        const shardsStatsSection = screen.getByTestId('shardsStatsSection');
        expect(within(shardsStatsSection).queryByTestId('shardsStats')).not.toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Footer', () => {
    const followerIndex = createMockFollowerIndex({ name: 'test-index' });

    it('should render and handle close button click', async () => {
      const closeDetailPanel = jest.fn();
      const user = userEvent.setup();

      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="test-index"
          followerIndex={followerIndex}
          closeDetailPanel={closeDetailPanel}
        />
      );

      const closeButton = screen.getByTestId('closeFlyoutButton');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent('Close');

      await user.click(closeButton);
      expect(closeDetailPanel).toHaveBeenCalledTimes(1);
    });

    it('should render View in Index Management button', () => {
      render(
        <DetailPanel {...defaultProps} followerIndexId="test-index" followerIndex={followerIndex} />
      );

      const button = screen.getByTestId('viewIndexManagementButton');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('View in Index Management');
    });

    it('should render manage button when follower index is loaded', () => {
      render(
        <DetailPanel {...defaultProps} followerIndexId="test-index" followerIndex={followerIndex} />
      );

      const manageButton = screen.getByTestId('manageButton');
      expect(manageButton).toBeInTheDocument();

      // Verify ContextMenu props
      const followerIndicesData = within(manageButton).getByTestId('contextMenuFollowerIndices');
      expect(followerIndicesData.textContent).toContain('test-index');
      expect(within(manageButton).getByText('Manage')).toBeInTheDocument();
    });

    it('should not render manage button when follower index is undefined', () => {
      render(
        <DetailPanel {...defaultProps} followerIndexId="test-index" followerIndex={undefined} />
      );

      expect(screen.queryByTestId('manageButton')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle follower index with all numeric values as zero', () => {
      const followerIndex = createMockFollowerIndex({
        maxReadRequestOperationCount: 0,
        maxOutstandingReadRequests: 0,
        maxWriteRequestOperationCount: 0,
        maxOutstandingWriteRequests: 0,
        maxWriteBufferCount: 0,
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      expect(screen.getByTestId('maxReadReqOpCount')).toHaveTextContent('0');
      expect(screen.getByTestId('maxOutstandingReadReq')).toHaveTextContent('0');
      expect(screen.getByTestId('maxWriteReqOpCount')).toHaveTextContent('0');
    });

    it('should handle follower index with empty string values', () => {
      const followerIndex = createMockFollowerIndex({
        maxReadRequestSize: '',
        maxWriteRequestSize: '',
        maxWriteBufferSize: '',
        maxRetryDelay: '',
        readPollTimeout: '',
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      expect(screen.getByTestId('maxReadReqSize')).toBeInTheDocument();
      expect(screen.getByTestId('maxWriteReqSize')).toBeInTheDocument();
      expect(screen.getByTestId('maxWriteBufferSize')).toBeInTheDocument();
    });

    it('should handle follower index with very long names', () => {
      const longName = 'a'.repeat(200);
      const followerIndex = createMockFollowerIndex({
        name: longName,
        remoteCluster: longName,
        leaderIndex: longName,
      });

      render(
        <DetailPanel {...defaultProps} followerIndexId={longName} followerIndex={followerIndex} />
      );

      expect(screen.getByTestId('title')).toHaveTextContent(longName);
      expect(screen.getByTestId('remoteCluster')).toHaveTextContent(longName);
      expect(screen.getByTestId('leaderIndex')).toHaveTextContent(longName);
    });

    it('should handle shard with empty readExceptions array', () => {
      const followerIndex = createMockFollowerIndex({
        shards: [
          createMockShard({
            id: 0,
            leaderGlobalCheckpoint: 100,
            readExceptions: [],
          }),
        ],
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      const shardsStats = screen.getByTestId('shardsStats');
      const shardData = JSON.parse(shardsStats.textContent || '{}');
      expect(shardData.readExceptions).toEqual([]);
    });
  });

  describe('API Status changes', () => {
    it('should render loading state when apiStatus changes to LOADING', () => {
      const { rerender } = render(<DetailPanel {...defaultProps} />);

      rerender(
        <IntlProvider locale="en">
          <DetailPanel {...defaultProps} apiStatus={API_STATUS.LOADING} followerIndex={undefined} />
        </IntlProvider>
      );

      expect(screen.getByText('Loading follower index…')).toBeInTheDocument();
    });

    it('should render content when apiStatus changes from LOADING to IDLE', () => {
      const followerIndex = createMockFollowerIndex();
      const { rerender } = render(
        <DetailPanel {...defaultProps} apiStatus={API_STATUS.LOADING} followerIndex={undefined} />
      );

      rerender(
        <IntlProvider locale="en">
          <DetailPanel
            {...defaultProps}
            apiStatus={API_STATUS.IDLE}
            followerIndex={followerIndex}
          />
        </IntlProvider>
      );

      expect(screen.queryByText('Loading follower index…')).not.toBeInTheDocument();
      expect(screen.getByTestId('status')).toBeInTheDocument();
    });
  });

  describe('Polling behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start polling when paused index is loaded with waitForActive param', async () => {
      mockLocationSearch.mockReturnValue('?waitForActive=true');
      const getFollowerIndex = jest.fn();
      const pausedFollowerIndex = createMockFollowerIndex({
        name: 'paused-index',
        isPaused: true,
        status: 'Paused',
      });

      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="paused-index"
          followerIndex={pausedFollowerIndex}
          getFollowerIndex={getFollowerIndex}
        />
      );

      // First poll after POLL_INTERVAL_MS
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });

      expect(getFollowerIndex).toHaveBeenCalledWith('paused-index');
      expect(getFollowerIndex).toHaveBeenCalledTimes(1);

      // Second poll after another POLL_INTERVAL_MS
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });

      expect(getFollowerIndex).toHaveBeenCalledTimes(2);
    });

    it('should not start polling without waitForActive param', async () => {
      const getFollowerIndex = jest.fn();
      const pausedFollowerIndex = createMockFollowerIndex({
        name: 'paused-index',
        isPaused: true,
        status: 'Paused',
      });

      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="paused-index"
          followerIndex={pausedFollowerIndex}
          getFollowerIndex={getFollowerIndex}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(POLL_TIMEOUT_MS);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should not start polling for active index even with waitForActive param', async () => {
      mockLocationSearch.mockReturnValue('?waitForActive=true');
      const getFollowerIndex = jest.fn();
      const activeFollowerIndex = createMockFollowerIndex({
        name: 'active-index',
        isPaused: false,
        status: 'Active',
      });

      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="active-index"
          followerIndex={activeFollowerIndex}
          getFollowerIndex={getFollowerIndex}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(POLL_TIMEOUT_MS);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should stop polling after timeout and clear URL param', async () => {
      mockLocationSearch.mockReturnValue('?waitForActive=true');
      const getFollowerIndex = jest.fn();
      const pausedFollowerIndex = createMockFollowerIndex({
        name: 'paused-index',
        isPaused: true,
        status: 'Paused',
      });

      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="paused-index"
          followerIndex={pausedFollowerIndex}
          getFollowerIndex={getFollowerIndex}
        />
      );

      // Advance to timeout
      await act(async () => {
        jest.advanceTimersByTime(POLL_TIMEOUT_MS);
      });

      // Should have polled 5 times (at 1s, 2s, 3s, 4s, 5s)
      expect(getFollowerIndex).toHaveBeenCalledTimes(5);

      // Should clear URL param
      expect(routing.navigate).toHaveBeenCalledWith('/follower_indices', {
        name: encodeURIComponent('paused-index'),
      });

      // No more polling after timeout
      getFollowerIndex.mockClear();
      await act(async () => {
        jest.advanceTimersByTime(POLL_TIMEOUT_MS);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should stop polling when index becomes active', async () => {
      mockLocationSearch.mockReturnValue('?waitForActive=true');
      const getFollowerIndex = jest.fn();
      const pausedFollowerIndex = createMockFollowerIndex({
        name: 'paused-index',
        isPaused: true,
        status: 'Paused',
      });

      const { rerender } = render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="paused-index"
          followerIndex={pausedFollowerIndex}
          getFollowerIndex={getFollowerIndex}
        />
      );

      // Poll once
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });

      expect(getFollowerIndex).toHaveBeenCalledTimes(1);

      // Update to active index
      const activeFollowerIndex = createMockFollowerIndex({
        name: 'paused-index',
        isPaused: false,
        status: 'Active',
      });

      rerender(
        <IntlProvider locale="en">
          <DetailPanel
            {...defaultProps}
            followerIndexId="paused-index"
            followerIndex={activeFollowerIndex}
            getFollowerIndex={getFollowerIndex}
          />
        </IntlProvider>
      );

      // Should clear URL param
      expect(routing.navigate).toHaveBeenCalledWith('/follower_indices', {
        name: encodeURIComponent('paused-index'),
      });

      // No more polling
      getFollowerIndex.mockClear();
      await act(async () => {
        jest.advanceTimersByTime(POLL_TIMEOUT_MS);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should show checking status message and hide settings section while polling', async () => {
      mockLocationSearch.mockReturnValue('?waitForActive=true');
      const pausedFollowerIndex = createMockFollowerIndex({
        name: 'paused-index',
        isPaused: true,
        status: 'Paused',
      });

      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="paused-index"
          followerIndex={pausedFollowerIndex}
        />
      );

      // Wait for polling to start
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Verify checking status message
      expect(screen.getByText('Checking status...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Verify settings section is hidden during polling
      expect(screen.queryByTestId('settingsSection')).not.toBeInTheDocument();

      // Verify isPollingStatus is passed to ContextMenu
      const manageButton = screen.getByTestId('manageButton');
      const isPollingStatus = within(manageButton).getByTestId('contextMenuIsPollingStatus');
      expect(isPollingStatus).toHaveTextContent('true');
    });
  });
});
