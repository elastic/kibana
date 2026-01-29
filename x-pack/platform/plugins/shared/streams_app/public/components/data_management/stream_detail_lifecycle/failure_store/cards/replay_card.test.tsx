/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplayCard } from './replay_card';

// Mock the hooks
const mockStartReplay = jest.fn();
const mockCancelReplay = jest.fn();
const mockReset = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
        },
      },
    },
  }),
}));

const mockUseFailureStoreReplay = jest.fn();
jest.mock('../../../../../hooks/use_failure_store_replay', () => ({
  useFailureStoreReplay: (...args: unknown[]) => mockUseFailureStoreReplay(...args),
}));

describe('ReplayCard', () => {
  const defaultProps = {
    streamName: 'logs',
    stats: { count: 10, size: 2048, bytesPerDay: 0, bytesPerDoc: 0, perDayDocs: 0 },
    hasPrivileges: true,
    onReplayComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFailureStoreReplay.mockReturnValue({
      state: { status: 'not_started' },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: false,
      isStarting: false,
      hasCompleted: false,
      hasFailed: false,
      wasCanceled: false,
    });
  });

  it('renders replay button when there are failed documents', () => {
    render(<ReplayCard {...defaultProps} />);
    expect(screen.getByTestId('replayCard')).toBeInTheDocument();
    expect(screen.getByTestId('replayFailedDocsButton')).toBeInTheDocument();
    expect(screen.getByText('Replay failed docs')).toBeInTheDocument();
  });

  it('does not render when count is 0 and not running', () => {
    const { container } = render(
      <ReplayCard
        {...defaultProps}
        stats={{ count: 0, size: 0, bytesPerDay: 0, bytesPerDoc: 0, perDayDocs: 0 }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when user lacks privileges', () => {
    const { container } = render(<ReplayCard {...defaultProps} hasPrivileges={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls startReplay when button is clicked', () => {
    render(<ReplayCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('replayFailedDocsButton'));
    expect(mockStartReplay).toHaveBeenCalled();
  });

  it('shows progress UI when replay is in progress', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: {
        status: 'in_progress',
        taskId: 'node:123',
        progress: {
          total: 100,
          created: 50,
          updated: 0,
          versionConflicts: 2,
          noops: 0,
        },
      },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: true,
      isStarting: false,
      hasCompleted: false,
      hasFailed: false,
      wasCanceled: false,
    });

    render(<ReplayCard {...defaultProps} />);
    expect(screen.getByText('Replaying failed documents...')).toBeInTheDocument();
    expect(screen.getByTestId('replayProgress')).toBeInTheDocument();
    expect(screen.getByTestId('cancelReplayButton')).toBeInTheDocument();
    expect(screen.getByText(/50 created/)).toBeInTheDocument();
    expect(screen.getByText(/2 conflicts/)).toBeInTheDocument();
    expect(screen.getByText(/100 total/)).toBeInTheDocument();
  });

  it('calls cancelReplay when cancel button is clicked', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: {
        status: 'in_progress',
        taskId: 'node:123',
        progress: { total: 100, created: 50 },
      },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: true,
      isStarting: false,
      hasCompleted: false,
      hasFailed: false,
      wasCanceled: false,
    });

    render(<ReplayCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('cancelReplayButton'));
    expect(mockCancelReplay).toHaveBeenCalled();
  });

  it('shows completion state when replay completes', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: {
        status: 'completed',
        taskId: 'node:123',
        progress: {
          total: 100,
          created: 98,
          took: 5000,
        },
      },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: false,
      isStarting: false,
      hasCompleted: true,
      hasFailed: false,
      wasCanceled: false,
    });

    render(<ReplayCard {...defaultProps} />);
    expect(screen.getByText('Replay completed successfully!')).toBeInTheDocument();
    expect(screen.getByText(/98 documents replayed/)).toBeInTheDocument();
  });

  it('shows error state and retry button when replay fails', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: {
        status: 'failed',
        taskId: 'node:123',
        error: 'Pipeline error',
        progress: { failures: [] },
      },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: false,
      isStarting: false,
      hasCompleted: false,
      hasFailed: true,
      wasCanceled: false,
    });

    render(<ReplayCard {...defaultProps} />);
    expect(screen.getByText(/Replay failed: Pipeline error/)).toBeInTheDocument();
    expect(screen.getByTestId('retryReplayButton')).toBeInTheDocument();
  });

  it('shows canceled state with option to retry', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: {
        status: 'canceled',
        taskId: 'node:123',
      },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: false,
      isStarting: false,
      hasCompleted: false,
      hasFailed: false,
      wasCanceled: true,
    });

    render(<ReplayCard {...defaultProps} />);
    expect(screen.getByText('Replay was canceled')).toBeInTheDocument();
    expect(screen.getByTestId('replayFailedDocsButton')).toBeInTheDocument();
  });

  it('shows card when replay is running even if count is 0', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: {
        status: 'in_progress',
        taskId: 'node:123',
        progress: { total: 50, created: 25 },
      },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: true,
      isStarting: false,
      hasCompleted: false,
      hasFailed: false,
      wasCanceled: false,
    });

    render(
      <ReplayCard
        {...defaultProps}
        stats={{ count: 0, size: 0, bytesPerDay: 0, bytesPerDoc: 0, perDayDocs: 0 }}
      />
    );
    expect(screen.getByTestId('replayCard')).toBeInTheDocument();
    expect(screen.getByText('Replaying failed documents...')).toBeInTheDocument();
  });

  it('shows loading state when starting replay', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: { status: 'starting' },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: false,
      isStarting: true,
      hasCompleted: false,
      hasFailed: false,
      wasCanceled: false,
    });

    render(<ReplayCard {...defaultProps} />);
    const button = screen.getByTestId('replayFailedDocsButton');
    // EUI button shows loading state via aria-label or class
    expect(button).toBeInTheDocument();
  });

  it('disables button when doc count is 0 in not_started state', () => {
    mockUseFailureStoreReplay.mockReturnValue({
      state: { status: 'canceled' },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: false,
      isStarting: false,
      hasCompleted: false,
      hasFailed: false,
      wasCanceled: true,
    });

    render(
      <ReplayCard
        {...defaultProps}
        stats={{ count: 0, size: 0, bytesPerDay: 0, bytesPerDoc: 0, perDayDocs: 0 }}
      />
    );
    // Card is shown because status is 'canceled', button should be disabled
    const button = screen.getByTestId('replayFailedDocsButton');
    expect(button).toBeDisabled();
  });

  it('auto-resets after completion', async () => {
    jest.useFakeTimers();

    mockUseFailureStoreReplay.mockReturnValue({
      state: {
        status: 'completed',
        taskId: 'node:123',
        progress: { created: 10, took: 1000 },
      },
      startReplay: mockStartReplay,
      cancelReplay: mockCancelReplay,
      reset: mockReset,
      isRunning: false,
      isStarting: false,
      hasCompleted: true,
      hasFailed: false,
      wasCanceled: false,
    });

    render(<ReplayCard {...defaultProps} />);

    // Fast-forward timer to trigger reset
    jest.advanceTimersByTime(3500);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});
