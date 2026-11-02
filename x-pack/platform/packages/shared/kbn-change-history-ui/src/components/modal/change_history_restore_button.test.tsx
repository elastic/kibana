/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ChangeHistoryProvider } from '../../provider/change_history_provider';
import type { ChangeHistoryAdapter } from '../../types/change_history_adapter';
import type { ChangeHistoryDetail } from '../../types/change_history_detail';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { ChangeHistoryRestoreButton } from './change_history_restore_button';
import {
  TEST_OBJECT_ID,
  TEST_OBJECT_TITLE,
  TEST_CHANGE_HISTORY_SCOPE,
  TEST_SNAPSHOT,
  TEST_SNAPSHOT_OLD,
} from '../../test_utils/change_history_test_fixtures';
import { TestProvider } from '../../test_utils/test_providers';
import type { ChangeHistoryPendingChange } from '../../types/change_history_pending_change';
import type { ChangeHistoryFeatures } from '../../types/change_history_features';
import { ChangeHistoryTelemetryEventTypes } from '../../telemetry/types';

const testScope = TEST_CHANGE_HISTORY_SCOPE;

const historicalChange: ChangeHistoryDetail = {
  id: 'evt-3',
  timestamp: '2026-06-15T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  metadata: { version: 3 },
  snapshot: TEST_SNAPSHOT_OLD,
};

const liveChange: ChangeHistoryDetail = {
  ...historicalChange,
  id: 'evt-7',
  isCurrent: true,
  metadata: { version: 7 },
};

const samplePendingChange: ChangeHistoryPendingChange = {
  id: '__pending__',
  timestamp: '2026-07-03T12:00:00.000Z',
  actor: { name: 'You' },
  action: 'Unsaved changes',
  snapshot: TEST_SNAPSHOT,
};

const renderButton = ({
  change = historicalChange,
  currentChange,
  features = { restore: true, unsavedChanges: true },
  permissions = { canRestore: true },
  restoreChange = jest.fn().mockResolvedValue(undefined),
  reportEvent,
  getPendingChange,
}: {
  change?: ChangeHistoryDetail;
  currentChange?: ChangeHistoryListItem;
  features?: ChangeHistoryFeatures;
  permissions?: { canRestore?: boolean };
  restoreChange?: ChangeHistoryAdapter['restoreChange'];
  reportEvent?: jest.Mock;
  getPendingChange?: ChangeHistoryAdapter['getPendingChange'];
} = {}) => {
  const adapter: ChangeHistoryAdapter = {
    listChanges: jest.fn(),
    getChange: jest.fn(),
    restoreChange,
    ...(getPendingChange ? { getPendingChange } : {}),
  };

  return render(
    <ChangeHistoryProvider
      objectId={TEST_OBJECT_ID}
      adapter={adapter}
      labels={{ previewTitle: TEST_OBJECT_TITLE }}
      features={features}
      permissions={permissions}
      renderPreview={() => null}
      scope={testScope}
      analytics={reportEvent ? { reportEvent } : undefined}
    >
      <ChangeHistoryRestoreButton change={change} currentChange={currentChange} />
    </ChangeHistoryProvider>,
    { wrapper: TestProvider }
  );
};

describe('ChangeHistoryRestoreButton', () => {
  it('renders nothing for the current version', () => {
    renderButton({ change: liveChange });

    expect(screen.queryByTestId('changeHistoryRestoreButton')).not.toBeInTheDocument();
  });

  it('renders nothing when restore feature is disabled', () => {
    renderButton({ features: { restore: false } });

    expect(screen.queryByTestId('changeHistoryRestoreButton')).not.toBeInTheDocument();
  });

  it('opens confirm modal and calls restoreChange on confirm', async () => {
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    renderButton({ restoreChange });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));
    expect(screen.getByTestId('changeHistoryRestoreConfirmModal')).toBeInTheDocument();
    expect(screen.getByText('Restore version 3?')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(restoreChange).toHaveBeenCalledWith({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
        signal: expect.any(AbortSignal),
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('changeHistoryRestoreConfirmModal')).not.toBeInTheDocument();
    });
  });

  it('reports restore_confirmed and restore_completed telemetry on successful restore', async () => {
    const reportEvent = jest.fn();
    const restoreChange = jest.fn().mockResolvedValue(undefined);

    renderButton({ restoreChange, reportEvent, currentChange: liveChange });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(reportEvent).toHaveBeenCalledWith(
        ChangeHistoryTelemetryEventTypes.RestoreConfirmed,
        expect.objectContaining({
          eventName: 'Change history restore confirmed',
          ...testScope,
          restoredFromSequence: 3,
          currentSequence: 7,
          rollbackDistance: 4,
        })
      );
    });

    const confirmedPayload = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ChangeHistoryTelemetryEventTypes.RestoreConfirmed
    )?.[1];
    expect(confirmedPayload).not.toHaveProperty('hadUnsavedLocalEdits');

    await waitFor(() => {
      expect(reportEvent).toHaveBeenCalledWith(
        ChangeHistoryTelemetryEventTypes.RestoreCompleted,
        expect.objectContaining({
          eventName: 'Change history restore completed',
          ...testScope,
          restoredFromSequence: 3,
          currentSequence: 7,
          rollbackDistance: 4,
          durationMs: expect.any(Number),
        })
      );
    });
  });

  it('reports hadUnsavedLocalEdits on restore telemetry when host has pending changes', async () => {
    const reportEvent = jest.fn();
    const restoreChange = jest.fn().mockResolvedValue(undefined);

    renderButton({
      restoreChange,
      reportEvent,
      currentChange: liveChange,
      getPendingChange: () => samplePendingChange,
    });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(reportEvent).toHaveBeenCalledWith(
        ChangeHistoryTelemetryEventTypes.RestoreConfirmed,
        expect.objectContaining({
          eventName: 'Change history restore confirmed',
          ...testScope,
          restoredFromSequence: 3,
          currentSequence: 7,
          rollbackDistance: 4,
          hadUnsavedLocalEdits: true,
        })
      );
    });

    await waitFor(() => {
      expect(reportEvent).toHaveBeenCalledWith(
        ChangeHistoryTelemetryEventTypes.RestoreCompleted,
        expect.objectContaining({
          hadUnsavedLocalEdits: true,
        })
      );
    });
  });

  it('reports restore_failed telemetry when restore fails', async () => {
    const reportEvent = jest.fn();
    const restoreChange = jest.fn().mockRejectedValue({
      body: {
        code: 'RESTORE_VALIDATION',
        message: 'Validation failed.',
      },
    });

    renderButton({ restoreChange, reportEvent, currentChange: liveChange });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(reportEvent).toHaveBeenCalledWith(ChangeHistoryTelemetryEventTypes.RestoreFailed, {
        eventName: 'Change history restore failed',
        ...testScope,
        restoredFromSequence: 3,
        currentSequence: 7,
        rollbackDistance: 4,
        errorCode: 'RESTORE_VALIDATION',
      });
    });
  });

  it('shows structured restore errors in the confirm modal', async () => {
    const restoreChange = jest.fn().mockRejectedValue({
      body: {
        code: 'RESTORE_VALIDATION',
        message: 'Validation failed.',
      },
    });

    renderButton({ restoreChange });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(screen.getByText('Validation failed.')).toBeInTheDocument();
    });
    expect(screen.getByTestId('changeHistoryRestoreConfirmModal')).toBeInTheDocument();
  });

  it('warns when restoring with unsaved host changes', () => {
    renderButton({ getPendingChange: () => samplePendingChange });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));

    expect(screen.getByTestId('changeHistoryRestoreConfirmModal')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You have unsaved changes. Restoring this version will overwrite all changes that have not been saved.'
      )
    ).toBeInTheDocument();
  });

  it('does not show unsaved changes warning when the feature is disabled', () => {
    renderButton({
      features: { restore: true, unsavedChanges: false },
      getPendingChange: () => samplePendingChange,
    });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));

    expect(screen.getByTestId('changeHistoryRestoreConfirmModal')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'You have unsaved changes. Restoring this version will overwrite all changes that have not been saved.'
      )
    ).not.toBeInTheDocument();
  });

  it('does not show unsaved changes warning when there is no pending change', () => {
    renderButton({ getPendingChange: () => undefined });

    fireEvent.click(screen.getByTestId('changeHistoryRestoreButton'));

    expect(screen.getByTestId('changeHistoryRestoreConfirmModal')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'You have unsaved changes. Restoring this version will overwrite all changes that have not been saved.'
      )
    ).not.toBeInTheDocument();
  });
});
