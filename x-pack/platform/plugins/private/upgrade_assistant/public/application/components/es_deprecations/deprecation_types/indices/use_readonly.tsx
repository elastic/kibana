/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { ApiService } from '../../../../lib/api';

export interface UpdateIndexState {
  failedBefore: boolean;
  status: 'incomplete' | 'inProgress' | 'complete' | 'failed';
  reason?: string;
}

export const useUpdateIndex = ({ indexName, api }: { indexName: string; api: ApiService }) => {
  const [failedState, setFailedState] = useState<boolean>(false);
  const [updateIndexState, setUpdateIndexState] = useState<UpdateIndexState>({
    failedBefore: false,
    status: 'incomplete',
  });

  const updateIndex = useCallback(async () => {
    setUpdateIndexState({ status: 'inProgress', failedBefore: failedState });
    const res = await api.updateIndex(indexName);
    // wait for 1.5 more seconds fur the UI to visually refresh
    const status = res.error ? 'failed' : 'complete';
    const failedBefore = failedState || status === 'failed';
    setFailedState(failedBefore);
    setTimeout(
      () =>
        setUpdateIndexState({
          status,
          failedBefore,
          ...(res.error && { reason: res.error.message.toString() }),
        }),
      1500
    );
  }, [api, failedState, indexName]);

  return {
    updateIndexState,
    updateIndex,
  };
};
