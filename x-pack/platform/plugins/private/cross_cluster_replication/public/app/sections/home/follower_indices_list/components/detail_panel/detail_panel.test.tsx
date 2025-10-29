/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getRandomString } from '@kbn/test-jest-helpers';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DetailPanel } from './detail_panel';
import { API_STATUS } from '../../../../../constants';
import type { FollowerIndexWithPausedStatus } from '../../../../../../../common/types';
import { routing } from '../../../../../services/routing';

// Mock the external dependencies
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

jest.mock('@kbn/index-management-plugin/public', () => ({
  getIndexListUri: jest.fn((filter) => `/index-list?${filter}`),
}));

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

// Custom render function that wraps components with IntlProvider
const render = (ui: React.ReactElement) => {
  return rtlRender(<IntlProvider locale="en">{ui}</IntlProvider>);
};

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
  shards: [
    {
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
    },
  ],
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
    // Clear URL search params
    delete (window as any).location;
    (window as any).location = { search: '' };
  });

  describe('Loading state', () => {
    it('should render loading spinner when API status is loading', () => {
      render(
        <DetailPanel {...defaultProps} apiStatus={API_STATUS.LOADING} followerIndex={undefined} />
      );

      expect(screen.getByText('Loading follower index…')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Not found state', () => {
    it('should render not found message when follower index is undefined', () => {
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

    beforeEach(() => {
      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="active-index"
          followerIndex={activeFollowerIndex}
        />
      );
    });

    it('should display active status with success color', () => {
      const status = screen.getByTestId('status');
      expect(status).toHaveTextContent('Active');
    });

    it('should display remote cluster information', () => {
      const remoteCluster = screen.getByTestId('remoteCluster');
      expect(remoteCluster).toHaveTextContent('remote-cluster-test');
    });

    it('should display leader index information', () => {
      const leaderIndex = screen.getByTestId('leaderIndex');
      expect(leaderIndex).toHaveTextContent('leader-index-test');
    });

    it('should render settings section with title', () => {
      const settingsSection = screen.getByTestId('settingsSection');
      expect(within(settingsSection).getByText('Settings')).toBeInTheDocument();
    });

    it('should display all settings values for active index', () => {
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
    });

    it('should have multiple settings values elements', () => {
      const settingsValues = screen.getAllByTestId('settingsValues');
      expect(settingsValues.length).toBeGreaterThan(0);
    });
  });

  describe('Paused follower index', () => {
    const pausedFollowerIndex = createMockFollowerIndex({
      name: 'paused-index',
      isPaused: true,
      status: 'Paused',
      shards: undefined,
    });

    beforeEach(() => {
      render(
        <DetailPanel
          {...defaultProps}
          followerIndexId="paused-index"
          followerIndex={pausedFollowerIndex}
        />
      );
    });

    it('should display paused status with subdued color', () => {
      const status = screen.getByTestId('status');
      expect(status).toHaveTextContent('Paused');
    });

    it('should not display settings values for paused index', () => {
      expect(screen.queryByTestId('maxReadReqOpCount')).not.toBeInTheDocument();
      expect(screen.queryByTestId('maxOutstandingReadReq')).not.toBeInTheDocument();
    });

    it('should display callout about paused follower index', () => {
      const settingsSection = screen.getByTestId('settingsSection');
      expect(
        within(settingsSection).getByText(
          /paused follower index does not have settings or shard statistics/i
        )
      ).toBeInTheDocument();
    });

    it('should not display shard statistics', () => {
      const shardsStatsSection = screen.getByTestId('shardsStatsSection');
      expect(within(shardsStatsSection).queryByTestId('shardsStats')).not.toBeInTheDocument();
    });
  });

  describe('Shard statistics', () => {
    it('should render shard statistics for active index with single shard', () => {
      const followerIndex = createMockFollowerIndex({
        isPaused: false,
        shards: [
          {
            id: 0,
            remoteCluster: 'remote-cluster-1',
            leaderIndex: 'leader-index-1',
            leaderGlobalCheckpoint: 500,
            leaderMaxSequenceNum: 500,
            followerGlobalCheckpoint: 500,
            followerMaxSequenceNum: 500,
            lastRequestedSequenceNum: 500,
            outstandingReadRequestsCount: 0,
            outstandingWriteRequestsCount: 0,
            writeBufferOperationsCount: 0,
            writeBufferSizeBytes: 0,
            followerMappingVersion: 1,
            followerSettingsVersion: 1,
            totalReadTimeMs: 50,
            totalReadRemoteExecTimeMs: 25,
            successfulReadRequestCount: 5,
            failedReadRequestsCount: 0,
            operationsReadCount: 500,
            bytesReadCount: 25000,
            totalWriteTimeMs: 50,
            successfulWriteRequestsCount: 5,
            failedWriteRequestsCount: 0,
            operationsWrittenCount: 500,
            readExceptions: [],
            timeSinceLastReadMs: 500,
          },
        ],
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      const shardsStatsSection = screen.getByTestId('shardsStatsSection');
      expect(within(shardsStatsSection).getByText('Shard 0 stats')).toBeInTheDocument();

      const shardsStats = screen.getByTestId('shardsStats');
      expect(shardsStats).toBeInTheDocument();

      const shardData = JSON.parse(shardsStats.textContent || '{}');
      expect(shardData.id).toBe(0);
      expect(shardData.leaderGlobalCheckpoint).toBe(500);
    });

    it('should render shard statistics for multiple shards', () => {
      const followerIndex = createMockFollowerIndex({
        isPaused: false,
        shards: [
          {
            id: 0,
            remoteCluster: 'remote-cluster-1',
            leaderIndex: 'leader-index-1',
            leaderGlobalCheckpoint: 500,
            leaderMaxSequenceNum: 500,
            followerGlobalCheckpoint: 500,
            followerMaxSequenceNum: 500,
            lastRequestedSequenceNum: 500,
            outstandingReadRequestsCount: 0,
            outstandingWriteRequestsCount: 0,
            writeBufferOperationsCount: 0,
            writeBufferSizeBytes: 0,
            followerMappingVersion: 1,
            followerSettingsVersion: 1,
            totalReadTimeMs: 50,
            totalReadRemoteExecTimeMs: 25,
            successfulReadRequestCount: 5,
            failedReadRequestsCount: 0,
            operationsReadCount: 500,
            bytesReadCount: 25000,
            totalWriteTimeMs: 50,
            successfulWriteRequestsCount: 5,
            failedWriteRequestsCount: 0,
            operationsWrittenCount: 500,
            readExceptions: [],
            timeSinceLastReadMs: 500,
          },
          {
            id: 1,
            remoteCluster: 'remote-cluster-1',
            leaderIndex: 'leader-index-1',
            leaderGlobalCheckpoint: 600,
            leaderMaxSequenceNum: 600,
            followerGlobalCheckpoint: 600,
            followerMaxSequenceNum: 600,
            lastRequestedSequenceNum: 600,
            outstandingReadRequestsCount: 0,
            outstandingWriteRequestsCount: 0,
            writeBufferOperationsCount: 0,
            writeBufferSizeBytes: 0,
            followerMappingVersion: 1,
            followerSettingsVersion: 1,
            totalReadTimeMs: 60,
            totalReadRemoteExecTimeMs: 30,
            successfulReadRequestCount: 6,
            failedReadRequestsCount: 0,
            operationsReadCount: 600,
            bytesReadCount: 30000,
            totalWriteTimeMs: 60,
            successfulWriteRequestsCount: 6,
            failedWriteRequestsCount: 0,
            operationsWrittenCount: 600,
            readExceptions: [],
            timeSinceLastReadMs: 600,
          },
        ],
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      const shardsStatsSection = screen.getByTestId('shardsStatsSection');
      expect(within(shardsStatsSection).getByText('Shard 0 stats')).toBeInTheDocument();
      expect(within(shardsStatsSection).getByText('Shard 1 stats')).toBeInTheDocument();

      const shardsStats = screen.getAllByTestId('shardsStats');
      expect(shardsStats).toHaveLength(2);

      const shard0Data = JSON.parse(shardsStats[0].textContent || '{}');
      expect(shard0Data.id).toBe(0);

      const shard1Data = JSON.parse(shardsStats[1].textContent || '{}');
      expect(shard1Data.id).toBe(1);
    });

    it('should not render shard statistics when shards is undefined', () => {
      const followerIndex = createMockFollowerIndex({
        isPaused: false,
        shards: undefined,
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      const shardsStatsSection = screen.getByTestId('shardsStatsSection');
      expect(within(shardsStatsSection).queryByTestId('shardsStats')).not.toBeInTheDocument();
    });

    it('should render empty shard stats section when shards array is empty', () => {
      const followerIndex = createMockFollowerIndex({
        isPaused: false,
        shards: [],
      });

      render(<DetailPanel {...defaultProps} followerIndex={followerIndex} />);

      const shardsStatsSection = screen.getByTestId('shardsStatsSection');
      expect(within(shardsStatsSection).queryByTestId('shardsStats')).not.toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    const followerIndex = createMockFollowerIndex({ name: 'test-index' });

    it('should render close button in footer', () => {
      render(
        <DetailPanel {...defaultProps} followerIndexId="test-index" followerIndex={followerIndex} />
      );

      expect(screen.getByTestId('closeFlyoutButton')).toBeInTheDocument();
      expect(screen.getByTestId('closeFlyoutButton')).toHaveTextContent('Close');
    });

    it('should call closeDetailPanel when close button is clicked', async () => {
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

      await user.click(screen.getByTestId('closeFlyoutButton'));

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

      expect(screen.getByTestId('manageButton')).toBeInTheDocument();
    });

    it('should not render manage button when follower index is undefined', () => {
      render(
        <DetailPanel {...defaultProps} followerIndexId="test-index" followerIndex={undefined} />
      );

      expect(screen.queryByTestId('manageButton')).not.toBeInTheDocument();
    });

    it('should pass correct props to ContextMenu', () => {
      render(
        <DetailPanel {...defaultProps} followerIndexId="test-index" followerIndex={followerIndex} />
      );

      const manageButton = screen.getByTestId('manageButton');
      const followerIndicesData = within(manageButton).getByTestId('contextMenuFollowerIndices');

      expect(followerIndicesData.textContent).toContain('test-index');
      expect(within(manageButton).getByText('Manage')).toBeInTheDocument();
    });
  });

  describe('PropTypes validation', () => {
    it('should render correctly with required props only', () => {
      const minimalProps = {
        followerIndexId: 'minimal-index',
        followerIndex: undefined,
        apiStatus: API_STATUS.IDLE,
        closeDetailPanel: jest.fn(),
        getFollowerIndex: jest.fn(),
      };

      render(<DetailPanel {...minimalProps} />);

      expect(screen.getByTestId('followerIndexDetail')).toBeInTheDocument();
    });

    it('should handle missing apiStatus gracefully', () => {
      render(
        <DetailPanel
          {...defaultProps}
          apiStatus={undefined as any}
          followerIndex={createMockFollowerIndex()}
        />
      );

      // Should render the follower index content (not loading state)
      expect(screen.queryByText('Loading follower index…')).not.toBeInTheDocument();
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
          {
            id: 0,
            remoteCluster: 'remote-cluster-1',
            leaderIndex: 'leader-index-1',
            leaderGlobalCheckpoint: 100,
            leaderMaxSequenceNum: 100,
            followerGlobalCheckpoint: 100,
            followerMaxSequenceNum: 100,
            lastRequestedSequenceNum: 100,
            outstandingReadRequestsCount: 0,
            outstandingWriteRequestsCount: 0,
            writeBufferOperationsCount: 0,
            writeBufferSizeBytes: 0,
            followerMappingVersion: 1,
            followerSettingsVersion: 1,
            totalReadTimeMs: 10,
            totalReadRemoteExecTimeMs: 5,
            successfulReadRequestCount: 1,
            failedReadRequestsCount: 0,
            operationsReadCount: 100,
            bytesReadCount: 5000,
            totalWriteTimeMs: 10,
            successfulWriteRequestsCount: 1,
            failedWriteRequestsCount: 0,
            operationsWrittenCount: 100,
            readExceptions: [],
            timeSinceLastReadMs: 100,
          },
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
      (window as any).location = { search: '?waitForActive=true' };
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

      // First poll after 1s
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(getFollowerIndex).toHaveBeenCalledWith('paused-index');
      expect(getFollowerIndex).toHaveBeenCalledTimes(1);

      // Second poll after another 1s
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(getFollowerIndex).toHaveBeenCalledTimes(2);
    });

    it('should not start polling without waitForActive param', async () => {
      (window as any).location = { search: '' };
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
        jest.advanceTimersByTime(5000);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should not start polling for active index', async () => {
      (window as any).location = { search: '?waitForActive=true' };
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
        jest.advanceTimersByTime(5000);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should stop polling after timeout and clear URL param', async () => {
      (window as any).location = { search: '?waitForActive=true' };
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

      // Advance to timeout (5000ms)
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should have called getFollowerIndex 5 times (at 1s, 2s, 3s, 4s, 5s)
      expect(getFollowerIndex).toHaveBeenCalledTimes(5);

      // Should clear URL param
      expect(routing.navigate).toHaveBeenCalledWith('/follower_indices', {
        name: encodeURIComponent('paused-index'),
      });

      // No more polling after timeout
      getFollowerIndex.mockClear();
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should stop polling when index becomes active', async () => {
      (window as any).location = { search: '?waitForActive=true' };
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
        jest.advanceTimersByTime(1000);
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
        jest.advanceTimersByTime(5000);
      });

      expect(getFollowerIndex).not.toHaveBeenCalled();
    });

    it('should show checking status message while polling paused index', async () => {
      (window as any).location = { search: '?waitForActive=true' };
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

      expect(screen.getByText('Checking status...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should pass isPollingStatus to ContextMenu', async () => {
      (window as any).location = { search: '?waitForActive=true' };
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

      const manageButton = screen.getByTestId('manageButton');
      const isPollingStatus = within(manageButton).getByTestId('contextMenuIsPollingStatus');

      expect(isPollingStatus).toHaveTextContent('true');
    });
  });
});
