/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { UpdateIndexOperation } from '../../../../../../common/update_index';
import type { UpdateActions } from '../../../../../../common/types';
import type { ApiService } from '../../../../lib/api';

export interface UpdateIndexState {
  failedBefore: boolean;
  status: 'incomplete' | 'inProgress' | 'complete' | 'failed';
  reason?: string;
  updateAction?: UpdateActions;
}

export interface UseUpdateIndexParams {
  indexName: string;
  api: ApiService;
}

export const useUpdateIndex = ({ indexName, api }: UseUpdateIndexParams) => {
  const [failedState, setFailedState] = useState<boolean>(false);
  const [updateIndexState, setUpdateIndexState] = useState<UpdateIndexState>({
    failedBefore: false,
    status: 'incomplete',
  });

  const updateIndex = useCallback(
    async (action: UpdateActions) => {
      const operations: UpdateIndexOperation[] =
        action === 'unfreeze' ? ['unfreeze'] : ['blockWrite', 'unfreeze'];

      setUpdateIndexState({
        status: 'inProgress',
        failedBefore: failedState,
        updateAction: action,
      });
      const res =
        action === 'delete'
          ? await api.deleteIndex(indexName)
          : await api.updateIndex(indexName, operations);
      const status = res.error ? 'failed' : 'complete';
      const failedBefore = failedState || status === 'failed';
      setFailedState(failedBefore);
      setUpdateIndexState({
        status,
        failedBefore,
        ...(res.error && { reason: res.error.message.toString() }),
        updateAction: action,
      });
    },
    [api, failedState, indexName]
  );

  return {
    updateIndexState,
    updateIndex,
  };
};
