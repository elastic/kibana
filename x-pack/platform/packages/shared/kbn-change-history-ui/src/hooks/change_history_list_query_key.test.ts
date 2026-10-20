/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  changeHistoryDetailQueryKey,
  changeHistoryListQueryKey,
  changeHistoryObjectQueryKeyPrefix,
  changeHistoryScopeQueryKeyPrefix,
} from './change_history_list_query_key';
import { TEST_CHANGE_HISTORY_SCOPE } from '../test_utils/change_history_test_fixtures';

describe('change history query keys', () => {
  it('includes scope segments before objectId', () => {
    expect(changeHistoryScopeQueryKeyPrefix(TEST_CHANGE_HISTORY_SCOPE)).toEqual([
      'change-history',
      'stack',
      'documents',
      'document',
    ]);
    expect(changeHistoryObjectQueryKeyPrefix('obj-1', TEST_CHANGE_HISTORY_SCOPE)).toEqual([
      'change-history',
      'stack',
      'documents',
      'document',
      'obj-1',
    ]);
    expect(
      changeHistoryListQueryKey({
        objectId: 'obj-1',
        scope: TEST_CHANGE_HISTORY_SCOPE,
        pageSize: 20,
      })
    ).toEqual(['change-history', 'stack', 'documents', 'document', 'obj-1', 'list', 20]);
    expect(
      changeHistoryDetailQueryKey({
        objectId: 'obj-1',
        changeId: 'evt-1',
        scope: TEST_CHANGE_HISTORY_SCOPE,
      })
    ).toEqual(['change-history', 'stack', 'documents', 'document', 'obj-1', 'detail', 'evt-1']);
  });

  it('isolates the same objectId across scopes', () => {
    const otherScope = { module: 'stack', dataset: 'cases', objectType: 'case' };

    expect(changeHistoryObjectQueryKeyPrefix('same-id', TEST_CHANGE_HISTORY_SCOPE)).not.toEqual(
      changeHistoryObjectQueryKeyPrefix('same-id', otherScope)
    );
  });
});
