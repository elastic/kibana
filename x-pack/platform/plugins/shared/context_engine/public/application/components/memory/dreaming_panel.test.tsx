/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_FEATURE_ID, uiPrivileges } from '../../../../common/features';
import type { MemoryDreamingStatusResponse } from '../../../../common/http_api/memory';
import { useKibana } from '../../hooks/use_kibana';
import {
  useMemoryDreamingStatus,
  useRunMemoryDreaming,
  useSetMemoryDreaming,
} from '../../hooks/use_memory_dreaming';
import { DreamingPanel } from './dreaming_panel';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../hooks/use_memory_dreaming', () => ({
  useMemoryDreamingStatus: jest.fn(),
  useSetMemoryDreaming: jest.fn(),
  useRunMemoryDreaming: jest.fn(),
}));

const mockUseKibana = jest.mocked(useKibana);
const mockUseStatus = jest.mocked(useMemoryDreamingStatus);
const mockUseSet = jest.mocked(useSetMemoryDreaming);
const mockUseRun = jest.mocked(useRunMemoryDreaming);

describe('DreamingPanel', () => {
  const setDreaming = jest.fn();
  const runDream = jest.fn();
  const getUrlForApp = jest.fn().mockReturnValue('/app/management/kibana/settings');

  const renderPanel = ({
    status,
    canWrite = true,
    error,
  }: {
    status?: MemoryDreamingStatusResponse;
    canWrite?: boolean;
    error?: Error;
  }) => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: { [CONTEXT_ENGINE_FEATURE_ID]: { [uiPrivileges.write]: canWrite } },
          getUrlForApp,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
    mockUseStatus.mockReturnValue({ status, isLoading: false, error });
    mockUseSet.mockReturnValue({ setDreaming, isSaving: false });
    mockUseRun.mockReturnValue({ runDream, isStarting: false });
    return render(
      <I18nProvider>
        <EuiProvider>
          <DreamingPanel />
        </EuiProvider>
      </I18nProvider>
    );
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('turns dreaming on from the switch', () => {
    renderPanel({ status: { enabled: false, interval: '24h' } });

    const toggle = screen.getByTestId('contextMemoryDreamingToggle');
    expect(toggle).not.toBeChecked();
    expect(screen.queryByTestId('contextMemoryDreamingStatus')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(setDreaming).toHaveBeenCalledWith({ enabled: true, scheduled: true });
    expect(screen.queryByTestId('contextMemoryDreamingRunNow')).not.toBeInTheDocument();
  });

  it('keeps showing the last dream after dreaming is turned off', () => {
    renderPanel({
      status: {
        enabled: false,
        interval: '24h',
        last_dream_at: '2026-10-01T12:00:00.000Z',
        last_run_status: 'success',
        last_run_memories_read: 2,
        last_run_applied: 1,
        last_run_skipped: 0,
      },
    });

    const statusList = screen.getByTestId('contextMemoryDreamingStatus');
    expect(statusList).toHaveTextContent('Last dream');
    expect(statusList).toHaveTextContent('Read 2 short-term memories in 0 batches, made 1 change');
    expect(statusList).not.toHaveTextContent('Turned on by');
  });

  it('switches to manual runs and starts a dream now', () => {
    renderPanel({ status: { enabled: true, scheduled: true, interval: '24h' } });

    fireEvent.click(screen.getByTestId('contextMemoryDreamingScheduleToggle'));
    expect(setDreaming).toHaveBeenCalledWith({ enabled: true, scheduled: false });

    fireEvent.click(screen.getByTestId('contextMemoryDreamingRunNow'));
    expect(runDream).toHaveBeenCalled();
  });

  it('turns rebuilds on, keeping the schedule', () => {
    renderPanel({ status: { enabled: true, scheduled: false, interval: '24h' } });

    expect(screen.queryByTestId('contextMemoryDreamingRebuildOn')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextMemoryDreamingRebuildToggle'));
    expect(setDreaming).toHaveBeenCalledWith({ enabled: true, scheduled: false, rebuild: true });
  });

  it('warns while rebuilds are on, and keeps them when the schedule changes', () => {
    renderPanel({ status: { enabled: true, scheduled: true, rebuild: true, interval: '24h' } });

    expect(screen.getByTestId('contextMemoryDreamingRebuildToggle')).toBeChecked();
    expect(screen.getByTestId('contextMemoryDreamingRebuildOn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextMemoryDreamingScheduleToggle'));
    expect(setDreaming).toHaveBeenCalledWith({ enabled: true, scheduled: false, rebuild: true });
  });

  it('hides the interval and next run for manual runs', () => {
    renderPanel({ status: { enabled: true, scheduled: false, interval: '24h' } });

    expect(screen.getByTestId('contextMemoryDreamingScheduleToggle')).not.toBeChecked();
    const statusList = screen.getByTestId('contextMemoryDreamingStatus');
    expect(statusList).not.toHaveTextContent('Runs every');
    expect(statusList).not.toHaveTextContent('Next run');
  });

  it('disables the controls while a dream runs', () => {
    renderPanel({ status: { enabled: true, scheduled: true, running: true, interval: '24h' } });

    expect(screen.getByTestId('contextMemoryDreamingRunNow')).toBeDisabled();
    expect(screen.getByTestId('contextMemoryDreamingRunNow')).toHaveTextContent('Dreaming…');
    expect(screen.getByTestId('contextMemoryDreamingToggle')).toBeDisabled();
    expect(screen.getByTestId('contextMemoryDreamingScheduleToggle')).toBeDisabled();
  });

  it('shows who turned dreaming on and links to the interval setting', () => {
    renderPanel({
      status: {
        enabled: true,
        enabled_by: { id: 'u1', username: 'elastic' },
        enabled_at: '2026-10-01T00:00:00.000Z',
        interval: '6h',
        next_run_at: '2026-10-02T00:00:00.000Z',
      },
    });

    expect(screen.getByTestId('contextMemoryDreamingToggle')).toBeChecked();
    const statusList = screen.getByTestId('contextMemoryDreamingStatus');
    expect(statusList).toHaveTextContent('elastic');
    expect(statusList).toHaveTextContent('6h');
    expect(statusList).toHaveTextContent('Not yet');
    expect(screen.getByTestId('contextMemoryDreamingIntervalLink')).toHaveAttribute(
      'href',
      '/app/management/kibana/settings'
    );
    expect(getUrlForApp).toHaveBeenCalledWith('management', {
      path: '/kibana/settings?query=contextEngine:memoryDreamingInterval',
    });
  });

  it('shows what the last successful run did', () => {
    renderPanel({
      status: {
        enabled: true,
        interval: '24h',
        last_run_status: 'success',
        last_run_memories_read: 1,
        last_run_applied: 0,
        last_run_skipped: 2,
        last_run_types: {
          'memory.fact': { memories_read: 1, applied: 0, skipped: 2, batches: 1 },
        },
      },
    });

    expect(screen.getByTestId('contextMemoryDreamingStatus')).toHaveTextContent(
      'Read 1 short-term memory in 1 batch, made 0 changes, skipped 2 proposed changes'
    );
  });

  it('breaks the last run down by type when several types ran', () => {
    renderPanel({
      status: {
        enabled: true,
        interval: '24h',
        last_run_status: 'partial',
        last_run_memories_read: 4,
        last_run_applied: 3,
        last_run_skipped: 1,
        last_run_types: {
          'memory.fact': { memories_read: 4, applied: 2, skipped: 1, batches: 1 },
          'memory.relationship': { memories_read: 4, applied: 1, skipped: 0, batches: 1 },
          'memory.entity': { memories_read: 0, applied: 0, skipped: 0, batches: 0, error: 'boom' },
        },
      },
    });

    const breakdown = screen.getByTestId('contextMemoryDreamingLastRunTypes');
    expect(breakdown).toHaveTextContent('Facts: read 4, made 2 changes, skipped 1');
    expect(breakdown).toHaveTextContent('Relationships: read 4, made 1 change, skipped 0');
    expect(breakdown).toHaveTextContent('Entities: failed after 0 short-term memories');
  });

  it('shows that dreaming is catching up instead of the next run', () => {
    renderPanel({
      status: {
        enabled: true,
        scheduled: true,
        interval: '24h',
        next_run_at: '2026-10-02T00:01:00.000Z',
        catching_up: true,
        pending_memories: 120,
      },
    });

    const statusList = screen.getByTestId('contextMemoryDreamingStatus');
    expect(statusList).toHaveTextContent('About 120 short-term memories left');
    expect(statusList).not.toHaveTextContent('Next run');
  });

  it('warns when part of the last dream failed', () => {
    renderPanel({
      status: {
        enabled: true,
        interval: '24h',
        last_run_status: 'partial',
        last_error: 'memory.fact: model unavailable',
      },
    });

    const callout = screen.getByTestId('contextMemoryDreamingLastRunFailed');
    expect(callout).toHaveTextContent('Part of the last dream failed');
    expect(callout).toHaveTextContent('memory.fact: model unavailable');
  });

  it('warns when the last dream failed', () => {
    renderPanel({
      status: {
        enabled: true,
        interval: '24h',
        last_run_status: 'failed',
        last_error: 'API key is invalid',
      },
    });

    const callout = screen.getByTestId('contextMemoryDreamingLastRunFailed');
    expect(callout).toHaveTextContent('API key is invalid');
    expect(callout).toHaveTextContent('turn it off and on again');
  });

  it('disables the switch without the write privilege', () => {
    renderPanel({ status: { enabled: false, interval: '24h' }, canWrite: false });

    expect(screen.getByTestId('contextMemoryDreamingToggle')).toBeDisabled();
  });

  it('shows the load error and disables the switch', () => {
    renderPanel({ error: new Error('Forbidden') });

    expect(screen.getByTestId('contextMemoryDreamingError')).toHaveTextContent('Forbidden');
    expect(screen.getByTestId('contextMemoryDreamingToggle')).toBeDisabled();
  });
});
