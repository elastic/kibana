/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { TransformManagementPage } from './page_objects';

export interface ExpectedTransformRow {
  description?: string;
  type?: string;
  status?: string;
  mode?: string;
  /** `null` asserts the row has no progress bar (continuous transforms). */
  progress?: number | null;
  health?: string;
}

const ROW_STATE_TIMEOUT_MS = 60_000;
const CELL_TIMEOUT_MS = 1000;

/**
 * Transform stats are polled by the list, so refresh until the row reflects the expected state.
 */
export const assertTransformRow = async (
  transformManagement: TransformManagementPage,
  transformId: string,
  expected: ExpectedTransformRow
) => {
  await expect(async () => {
    await transformManagement.refreshList();
    const cell = (column: 'Description' | 'Type' | 'Status' | 'Mode') =>
      transformManagement.getRowCell(transformId, column);

    if (expected.description !== undefined) {
      await expect(cell('Description')).toContainText(expected.description, {
        timeout: CELL_TIMEOUT_MS,
      });
    }
    if (expected.type !== undefined) {
      await expect(cell('Type')).toContainText(expected.type, { timeout: CELL_TIMEOUT_MS });
    }
    if (expected.status !== undefined) {
      await expect(cell('Status')).toContainText(expected.status, { timeout: CELL_TIMEOUT_MS });
    }
    if (expected.mode !== undefined) {
      await expect(cell('Mode')).toContainText(expected.mode, { timeout: CELL_TIMEOUT_MS });
    }
    if (expected.progress === null) {
      await expect(transformManagement.getRowProgress(transformId)).toHaveCount(0, {
        timeout: CELL_TIMEOUT_MS,
      });
    } else if (expected.progress !== undefined) {
      await expect(transformManagement.getRowProgress(transformId)).toHaveAttribute(
        'value',
        String(expected.progress),
        { timeout: CELL_TIMEOUT_MS }
      );
    }
    if (expected.health !== undefined) {
      await expect(transformManagement.getRowHealth(transformId)).toHaveText(expected.health, {
        timeout: CELL_TIMEOUT_MS,
      });
    }
  }).toPass({ timeout: ROW_STATE_TIMEOUT_MS });
};

/** Row actions of a transform that isn't running: everything but Stop. */
export const assertStoppedTransformRowActions = async (
  transformManagement: TransformManagementPage,
  transformId: string
) => {
  await transformManagement.openRowActions(transformId);
  for (const action of ['Clone', 'Delete', 'Discover', 'Edit', 'Reset', 'Start'] as const) {
    await expect(transformManagement.getRowAction(action)).toBeVisible();
  }
  await expect(transformManagement.getRowAction('Stop')).toBeHidden();
  await transformManagement.closeRowActions(transformId);
};

/**
 * Audit messages are indexed asynchronously and the app caches queries indefinitely,
 * so reload (invalidates every query) until the message shows up.
 */
export const assertExpandedRowMessage = async (
  transformManagement: TransformManagementPage,
  message: string
) => {
  await transformManagement.openExpandedRowTab('Messages');
  await expect(async () => {
    await transformManagement.refreshList();
    await expect(transformManagement.getExpandedRowTabContent('Messages')).toContainText(message, {
      ignoreCase: true,
      timeout: CELL_TIMEOUT_MS,
    });
  }).toPass({ timeout: ROW_STATE_TIMEOUT_MS });
};
