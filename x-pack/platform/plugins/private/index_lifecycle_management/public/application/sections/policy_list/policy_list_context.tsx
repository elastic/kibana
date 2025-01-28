/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactChild, useContext, useState } from 'react';
import { PolicyFromES } from '../../../../common/types';

interface ListAction {
  actionType: 'viewIndexTemplates' | 'addIndexTemplate' | 'deletePolicy' | 'viewPolicy';
  selectedPolicy: PolicyFromES;
}

export interface PolicyListContextValue {
  listAction: ListAction | null;
  setListAction: (policyAction: ListAction | null) => void;
}

const PolicyListContext = createContext<PolicyListContextValue>({
  listAction: null,
  setListAction: () => {},
});

export const PolicyListContextProvider = ({ children }: { children: ReactChild }) => {
  const [listAction, setListAction] = useState<ListAction | null>(null);

  return (
    <PolicyListContext.Provider
      value={{
        listAction,
        setListAction,
      }}
    >
      {children}
    </PolicyListContext.Provider>
  );
};

export const usePolicyListContext = (): PolicyListContextValue => {
  const ctx = useContext(PolicyListContext);
  if (!ctx) {
    throw new Error('usePolicyListContext can only be called inside of PolicyListContext!');
  }
  return ctx;
};
