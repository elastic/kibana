/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { AppLeaveHandler } from '@kbn/core-application-browser';

export type OnAppLeave = (handler: AppLeaveHandler) => void;

const AppLeaveContext = createContext<OnAppLeave | undefined>(undefined);

export const useAppLeave = () => {
  const context = useContext(AppLeaveContext);
  if (context === undefined) {
    throw new Error('useAppLeave must be used within an AppLeaveContext.Provider');
  }
  return context;
};

export { AppLeaveContext };
