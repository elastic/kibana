/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

interface CreatePackagePolicyFormContextValue {
  createDatasetTemplates: boolean;
  setCreateDatasetTemplates: (value: boolean) => void;
}

const CreatePackagePolicyFormContext = React.createContext<
  CreatePackagePolicyFormContextValue | undefined
>(undefined);

export const CreatePackagePolicyFormProvider = CreatePackagePolicyFormContext.Provider;

export const useCreatePackagePolicyFormContext = () => {
  return useContext(CreatePackagePolicyFormContext);
};
