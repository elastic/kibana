/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { ApiService } from '../../../../lib/api';
import { useReindex, ReindexState } from './use_reindex';
import { UpdateIndexState, useUpdateIndex } from './use_update_index';
import {
  EnrichedDeprecationInfo,
  IndexAction,
  UpdateActions,
} from '../../../../../../common/types';

export interface IndexStateContext {
  deprecation: EnrichedDeprecationInfo;
  reindexState: ReindexState;
  startReindex: () => Promise<void>;
  cancelReindex: () => Promise<void>;
  updateIndexState: UpdateIndexState;
  updateIndex: (action: UpdateActions) => Promise<void>;
}

const IndexContext = createContext<IndexStateContext | undefined>(undefined);

export const useIndexContext = () => {
  const context = useContext(IndexContext);
  if (context === undefined) {
    throw new Error('useIndexContext must be used within a <IndexStatusProvider />');
  }
  return context;
};

interface Props {
  api: ApiService;
  children: React.ReactNode;
  deprecation: EnrichedDeprecationInfo;
}

export const IndexStatusProvider: React.FunctionComponent<Props> = ({
  api,
  deprecation,
  children,
}) => {
  const indexName = deprecation.index!;
  const indexAction = deprecation.correctiveAction as IndexAction;
  const { reindexState, startReindex, cancelReindex } = useReindex({
    indexName,
    api,
    isInDataStream: Boolean(indexAction?.metadata.isInDataStream),
    isFrozen: Boolean(indexAction?.metadata.isFrozenIndex),
    isClosedIndex: Boolean(indexAction?.metadata.isClosedIndex),
  });

  const { updateIndexState, updateIndex } = useUpdateIndex({
    indexName,
    api,
  });

  return (
    <IndexContext.Provider
      value={{
        deprecation,
        reindexState,
        startReindex,
        cancelReindex,
        updateIndexState,
        updateIndex,
      }}
    >
      {children}
    </IndexContext.Provider>
  );
};
