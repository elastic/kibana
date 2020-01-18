/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { ExpressionsProvider } from './use_expressions';
import { UIProvider } from './use_ui';

export const ContextProvider = ({ children }: { children: React.ReactNode }) => (
  <UIProvider>
    <ExpressionsProvider>{children}</ExpressionsProvider>
  </UIProvider>
);

export { useUI, useUIActions } from './use_ui';
export { useExpressions, useExpressionsActions } from './use_expressions';
