/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UpdateIndexOperation } from '../../../../../../common/update_index';
import type { CorrectiveAction } from '../../../../../../common/types';
import type { ApiService } from '../../../../lib/api';

export interface UpdateIndexState {
  failedBefore: boolean;
  status: 'incomplete' | 'inProgress' | 'complete' | 'failed';
  reason?: string;
}

export interface UseUpdateIndexParams {
  indexName: string;
  api: ApiService;
  correctiveAction?: CorrectiveAction;
}

export const useUpdateIndex = ({ indexName, api, correctiveAction }: UseUpdateIndexParams) => {
  const isMounted = useRef(false);
  const [failedState, setFailedState] = useState<boolean>(false);
  const [updateIndexState, setUpdateIndexState] = useState<UpdateIndexState>({
    failedBefore: false,
    status: 'incomplete',
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const updateIndex = useCallback(async () => {
    const operations: UpdateIndexOperation[] =
      correctiveAction?.type === 'unfreeze' ? ['unfreeze'] : ['blockWrite', 'unfreeze'];

    if (!isMounted.current) {
      return;
    }

    setUpdateIndexState({ status: 'inProgress', failedBefore: failedState });
    const res = await api.updateIndex(indexName, operations);
    const status = res.error ? 'failed' : 'complete';
    const failedBefore = failedState || status === 'failed';

    if (!isMounted.current) {
      return;
    }

    setFailedState(failedBefore);
    setUpdateIndexState({
      status,
      failedBefore,
      ...(res.error && { reason: res.error.message.toString() }),
    });
  }, [api, correctiveAction, failedState, indexName]);

  return {
    updateIndexState,
    updateIndex,
  };
};
