/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockChangeHistoryAdapter } from './create_mock_adapter';
import { createMockChangeHistoryDetails } from './change_history_fixtures';

describe('createMockChangeHistoryAdapter', () => {
  it('returns paginated list rows newest-first', async () => {
    const adapter = createMockChangeHistoryAdapter({
      changes: createMockChangeHistoryDetails(),
    });

    const firstPage = await adapter.listChanges({
      objectId: 'object-1',
      page: { index: 0, size: 2 },
    });

    expect(firstPage.total).toBe(3);
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items[0]?.id).toBe('evt-current');
    expect(firstPage.items[1]?.id).toBe('evt-2');

    const secondPage = await adapter.listChanges({
      objectId: 'object-1',
      page: { index: 1, size: 2 },
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.id).toBe('evt-1');
  });

  it('resolves getChange from the in-memory store', async () => {
    const adapter = createMockChangeHistoryAdapter();

    const detail = await adapter.getChange({
      objectId: 'object-1',
      changeId: 'evt-2',
    });

    expect(detail.snapshot).toEqual({
      name: 'example',
      version: 2,
      steps: ['notify'],
    });
  });

  it('supports updating the in-memory change set', async () => {
    const adapter = createMockChangeHistoryAdapter({
      changes: createMockChangeHistoryDetails().slice(0, 1),
    });

    adapter.setChanges(createMockChangeHistoryDetails());

    const result = await adapter.listChanges({
      objectId: 'object-1',
      page: { index: 0, size: 10 },
    });

    expect(result.total).toBe(3);
    expect(adapter.getChanges()).toHaveLength(3);
  });

  it('forwards restore and pending-change hooks when provided', async () => {
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const getPendingChange = jest.fn().mockReturnValue({
      id: 'pending-1',
      timestamp: '2026-06-16T13:00:00.000Z',
      actor: { name: 'Alice' },
      action: 'Unsaved changes',
      snapshot: { draft: true },
    });

    const adapter = createMockChangeHistoryAdapter({
      onRestoreChange: restoreChange,
      getPendingChange,
    });

    await adapter.restoreChange?.({
      objectId: 'object-1',
      changeId: 'evt-2',
    });

    expect(restoreChange).toHaveBeenCalledWith({
      objectId: 'object-1',
      changeId: 'evt-2',
    });
    expect(adapter.getPendingChange?.()).toEqual({
      id: 'pending-1',
      timestamp: '2026-06-16T13:00:00.000Z',
      actor: { name: 'Alice' },
      action: 'Unsaved changes',
      snapshot: { draft: true },
    });
  });
});
