/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';

import { Core, Plugins } from '../shim';

const CoreContext = createContext<Core | undefined>(undefined);

export const getAppProviders = ({ core, plugins }: { core: Core; plugins: Plugins }) => ({
  children,
}: {
  children: React.ReactNode;
}) => <CoreContext.Provider value={core}>{children}</CoreContext.Provider>;

export const useCore = (): Core => {
  const ctx = useContext(CoreContext);
  if (ctx === undefined) {
    throw new Error('useCore must be used within an AppProviders');
  }
  return ctx;
};
