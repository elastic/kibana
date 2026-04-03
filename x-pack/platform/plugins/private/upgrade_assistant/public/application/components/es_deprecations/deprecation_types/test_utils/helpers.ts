/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichedDeprecationInfo } from '../../../../../../common/types';
import type { IndexStateContext } from '../indices/context';
import type { ReindexState } from '../indices/use_reindex';
import type { UpdateIndexState } from '../indices/use_update_index';
import { LoadingState } from '../../../types';

export const createReindexState = (overrides?: Partial<ReindexState>): ReindexState => ({
  loadingState: LoadingState.Success,
  errorMessage: null,
  reindexTaskPercComplete: null,
  status: undefined,
  lastCompletedStep: undefined,
  cancelLoadingState: undefined,
  reindexWarnings: undefined,
  hasRequiredPrivileges: true,
  meta: {
    indexName: 'test-index',
    reindexName: 'test-index-reindexed',
    aliases: [],
    isFrozen: false,
    isReadonly: false,
    isInDataStream: false,
    isClosedIndex: false,
    isFollowerIndex: false,
  },
  ...overrides,
});

export const createUpdateIndexState = (
  overrides?: Partial<UpdateIndexState>
): UpdateIndexState => ({
  failedBefore: false,
  status: 'incomplete',
  ...overrides,
});

export const createIndexContext = ({
  deprecation,
  reindexState,
  updateIndexState,
}: {
  deprecation: EnrichedDeprecationInfo;
  reindexState: ReindexState;
  updateIndexState: UpdateIndexState;
}): IndexStateContext => ({
  deprecation,
  reindexState,
  updateIndexState,
  startReindex: jest.fn<Promise<void>, []>(),
  cancelReindex: jest.fn<Promise<void>, []>(),
  updateIndex: jest.fn<Promise<void>, []>(),
});
