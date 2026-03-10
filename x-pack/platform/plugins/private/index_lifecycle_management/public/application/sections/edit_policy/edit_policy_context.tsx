/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactChild } from 'react';
import React, { createContext, useContext } from 'react';

import type { PolicyFromES, SerializedPolicy } from '../../../../common/types';

export interface EditPolicyContextValue {
  isNewPolicy: boolean;
  policy: SerializedPolicy;
  existingPolicies: PolicyFromES[];
  license: {
    canUseSearchableSnapshot: () => boolean;
  };
  policyName?: string;
  indices: string[];
  indexTemplates: string[];
}

const EditPolicyContext = createContext<EditPolicyContextValue>(null as any);

export const EditPolicyContextProvider = ({
  value,
  children,
}: {
  value: EditPolicyContextValue;
  children: ReactChild;
}) => {
  return <EditPolicyContext.Provider value={value}>{children}</EditPolicyContext.Provider>;
};

export const useEditPolicyContext = (): EditPolicyContextValue => {
  const ctx = useContext(EditPolicyContext);
  if (!ctx) {
    throw new Error('useEditPolicyContext can only be called inside of EditPolicyContext!');
  }
  return ctx;
};
