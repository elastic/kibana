/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfiniteData } from '@kbn/react-query';
import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import type { ListChangeHistoryResult } from '../types/list_change_history_params';
import {
  TEST_CHANGE_HISTORY_SCOPE,
  TEST_OBJECT_ID,
} from '../test_utils/change_history_test_fixtures';
import { changeHistoryListQueryKey } from '../hooks/change_history_list_query_key';
import { createTestQueryClient } from '../test_utils/create_query_client_wrapper';
import { getChangeHistoryNewSequenceAfterRestore } from './get_change_history_new_sequence_after_restore';

const listItem = (overrides: Partial<ChangeHistoryListItem> = {}): ChangeHistoryListItem => ({
  id: 'evt-1',
  timestamp: '2026-01-01T00:00:00Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  ...overrides,
});

describe('getChangeHistoryNewSequenceAfterRestore', () => {
  it('reads sequence from the current row after list refetch', () => {
    const queryClient = createTestQueryClient();
    const listData: InfiniteData<ListChangeHistoryResult> = {
      pages: [
        {
          items: [
            listItem({
              id: 'evt-8',
              isCurrent: true,
              metadata: { version: 8 },
            }),
          ],
          total: 8,
        },
      ],
      pageParams: [0],
    };

    queryClient.setQueryData(
      changeHistoryListQueryKey({ objectId: TEST_OBJECT_ID, scope: TEST_CHANGE_HISTORY_SCOPE }),
      listData
    );

    expect(
      getChangeHistoryNewSequenceAfterRestore({
        queryClient,
        objectId: TEST_OBJECT_ID,
        scope: TEST_CHANGE_HISTORY_SCOPE,
      })
    ).toBe(8);
  });

  it('returns undefined when the list cache is empty', () => {
    const queryClient = createTestQueryClient();

    expect(
      getChangeHistoryNewSequenceAfterRestore({
        queryClient,
        objectId: TEST_OBJECT_ID,
        scope: TEST_CHANGE_HISTORY_SCOPE,
      })
    ).toBeUndefined();
  });
});
