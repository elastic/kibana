/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';

import { Core, Plugins } from '../shim';
import { initLibs } from '../lib';
import { ApiRequests } from '../lib/api';

interface AppCore extends Core {
  api: ApiRequests;
}

const CoreContext = createContext<AppCore | undefined>(undefined);

export const getAppProviders = ({ core, plugins }: { core: Core; plugins: Plugins }) => ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Init our libs and create our App core
  const libs = initLibs(core);
  const appCore: AppCore = { ...core, ...libs };

  return <CoreContext.Provider value={appCore}>{children}</CoreContext.Provider>;
};

export const useCore = (): AppCore => {
  const ctx = useContext(CoreContext);
  if (ctx === undefined) {
    throw new Error('useCore must be used within an AppProviders');
  }
  return ctx;
};
