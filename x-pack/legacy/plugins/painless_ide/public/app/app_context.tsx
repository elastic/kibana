/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';

import { Core, I18n } from '../legacy';

interface AppDependencies {
  i18n: I18n;
  notifications: Core['notifications'];
  chrome: Core['chrome'];
}

const CoreContext = createContext<AppDependencies | undefined>(undefined);

export const getAppProviders = ({ core }: { core: Core }) => ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    __LEGACY: { i18n },
    notifications,
    chrome,
  } = core;

  const { Context: I18nContext } = i18n;
  const appDependencies = { i18n, notifications, chrome };

  return (
    <I18nContext>
      <CoreContext.Provider value={appDependencies}> {children} </CoreContext.Provider>
    </I18nContext>
  );
};

export const useCore = (): AppDependencies => {
  const ctx = useContext(CoreContext);
  if (ctx === undefined) {
    throw new Error('useCore must be used within AppProviders');
  }
  return ctx;
};
