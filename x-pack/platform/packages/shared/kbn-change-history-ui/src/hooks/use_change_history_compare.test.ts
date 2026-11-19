/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useChangeHistoryCompare } from './use_change_history_compare';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryDetail } from '../types/change_history_detail';
import { TEST_SNAPSHOT } from '../test_utils/change_history_test_fixtures';
import { createChangeHistoryHookWrapper } from '../test_utils/create_change_history_hook_wrapper';

const createDetail = (id: string): ChangeHistoryDetail => ({
  id,
  timestamp: '2026-01-01T00:00:00Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  snapshot: TEST_SNAPSHOT,
});

describe('useChangeHistoryCompare', () => {
  it('does not build a spec from a previous comparison baseline while the new one loads', async () => {
    const listItems = [createDetail('evt-3'), createDetail('evt-2'), createDetail('evt-1')];
    let resolveEvt1: (detail: ChangeHistoryDetail) => void = () => {};

    const adapter: ChangeHistoryAdapter = {
      listChanges: jest.fn(),
      getChange: jest.fn(({ changeId }: { changeId: string }) =>
        changeId === 'evt-1'
          ? new Promise<ChangeHistoryDetail>((resolve) => {
              resolveEvt1 = resolve;
            })
          : Promise.resolve(createDetail(changeId))
      ),
    };

    const { wrapper } = createChangeHistoryHookWrapper({ adapter });

    const { result, rerender } = renderHook(
      ({ selectedChangeId }: { selectedChangeId: string }) =>
        useChangeHistoryCompare({
          adapter,
          objectId: 'obj-1',
          listItems,
          selectedChange: createDetail(selectedChangeId),
          selectedChangeId,
          compareMode: { type: 'vs_previous' },
        }),
      { wrapper, initialProps: { selectedChangeId: 'evt-3' } }
    );

    await waitFor(() => {
      expect(result.current.compareSpec?.baseline.id).toBe('evt-2');
    });

    rerender({ selectedChangeId: 'evt-2' });

    expect(result.current.compareSpec).toBeUndefined();
    expect(result.current.isLoadingCompareContext).toBe(true);

    resolveEvt1(createDetail('evt-1'));

    await waitFor(() => {
      expect(result.current.compareSpec?.baseline.id).toBe('evt-1');
    });
    expect(result.current.compareSpec?.target.id).toBe('evt-2');
  });
});
