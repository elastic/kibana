/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveImportStatus, type ImportStatusInput } from './derive_import_status';

const now = new Date('2026-10-28T12:00:00.000Z');

const healthy: ImportStatusInput = {
  enabled: true,
  connectorExists: true,
  workflowExists: true,
  workflowEnabled: true,
  lastExecutionStatus: 'completed',
  lastAlertAt: '2026-10-28T11:00:00.000Z',
  now,
};

describe('deriveImportStatus', () => {
  it('is receiving when an alert came in the last 24 hours', () => {
    expect(deriveImportStatus(healthy)).toBe('receiving');
  });

  it('is idle when the last alert is older than 24 hours', () => {
    expect(deriveImportStatus({ ...healthy, lastAlertAt: '2026-10-27T11:00:00.000Z' })).toBe(
      'idle'
    );
  });

  it('is waiting when no alert was ever created', () => {
    expect(
      deriveImportStatus({ ...healthy, lastAlertAt: null, lastExecutionStatus: undefined })
    ).toBe('waiting');
  });

  it.each(['failed', 'timed_out'])('is failing when the last run %s', (lastExecutionStatus) => {
    expect(deriveImportStatus({ ...healthy, lastExecutionStatus })).toBe('failing');
  });

  it('is not failing for a run that is still going', () => {
    expect(deriveImportStatus({ ...healthy, lastExecutionStatus: 'running' })).toBe('receiving');
  });

  it('is disabled when the record or the workflow is disabled', () => {
    expect(deriveImportStatus({ ...healthy, enabled: false })).toBe('disabled');
    expect(deriveImportStatus({ ...healthy, workflowEnabled: false })).toBe('disabled');
  });

  it('reports a missing connector before anything else', () => {
    expect(
      deriveImportStatus({
        ...healthy,
        connectorExists: false,
        workflowExists: false,
        enabled: false,
        lastExecutionStatus: 'failed',
      })
    ).toBe('connector_missing');
  });

  it('reports a missing workflow before disabled or failing', () => {
    expect(
      deriveImportStatus({
        ...healthy,
        workflowExists: false,
        workflowEnabled: false,
        lastExecutionStatus: 'failed',
      })
    ).toBe('workflow_missing');
  });
});
