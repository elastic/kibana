/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import type { CaseTask } from '../../common/types/domain/task/v1';
import { TestProviders } from '../common/mock';
import { noUpdateCasesPermissions } from '../common/mock/permissions';
import { refreshTaskWorkflow } from './api';
import { usePollTaskWorkflowRuns } from './use_case_tasks';

jest.mock('./api', () => ({ refreshTaskWorkflow: jest.fn() }));
jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
}));

const mockRefresh = refreshTaskWorkflow as jest.Mock;
const mockCapabilities = useWorkflowsCapabilities as jest.Mock;

const runningTask = {
  id: 'task-1',
  workflow_run: {
    execution_id: 'exec-1',
    status: 'running',
    started_at: '2026-11-06T00:00:00.000Z',
    finished_at: null,
  },
} as unknown as CaseTask;

describe('usePollTaskWorkflowRuns', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockRefresh.mockResolvedValue({ ...runningTask, workflow_run: { status: 'succeeded' } });
    mockCapabilities.mockReturnValue({ canReadWorkflow: true });
  });

  afterEach(() => jest.useRealTimers());

  it('reads the outcome of a running task every few seconds', async () => {
    renderHook(() => usePollTaskWorkflowRuns('case-1', [runningTask]), {
      wrapper: TestProviders,
    });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockRefresh).toHaveBeenCalledWith('case-1', 'task-1');
  });

  it('does not poll for people who cannot read the outcome', async () => {
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <TestProviders permissions={noUpdateCasesPermissions()}>{children}</TestProviders>
    );
    renderHook(() => usePollTaskWorkflowRuns('case-1', [runningTask]), { wrapper: Wrapper });
    mockCapabilities.mockReturnValue({ canReadWorkflow: false });
    renderHook(() => usePollTaskWorkflowRuns('case-1', [runningTask]), {
      wrapper: TestProviders,
    });

    await act(async () => {
      jest.advanceTimersByTime(9000);
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
