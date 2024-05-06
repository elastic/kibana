/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';
import type { SerializedEnrichPolicy } from '../../../../common';

export type DraftPolicy = Partial<SerializedEnrichPolicy>;

export interface CompletionState {
  configurationStep: boolean;
  fieldsSelectionStep: boolean;
}

export interface Context {
  draft: DraftPolicy;
  updateDraft: React.Dispatch<React.SetStateAction<DraftPolicy>>;
  completionState: CompletionState;
  updateCompletionState: React.Dispatch<React.SetStateAction<CompletionState>>;
}

export const CreatePolicyContext = createContext<Context>({} as any);

export const CreatePolicyContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [draft, updateDraft] = useState<DraftPolicy>({});
  const [completionState, updateCompletionState] = useState<CompletionState>({
    configurationStep: false,
    fieldsSelectionStep: false,
  });

  const contextValue = {
    draft,
    updateDraft,
    completionState,
    updateCompletionState,
  };

  return (
    <CreatePolicyContext.Provider value={contextValue}>{children}</CreatePolicyContext.Provider>
  );
};

export const useCreatePolicyContext = () => {
  const ctx = useContext(CreatePolicyContext);
  if (!ctx) throw new Error('Cannot use outside of create policy context');

  return ctx;
};
