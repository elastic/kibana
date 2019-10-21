/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Main } from './containers';
import { AppContextProvider } from './app_context';

import { AppDependencies } from './boot';

export function App({
  I18nContext,
  licenseEnabled,
  notifications,
  http,
  formatAngularHttpError,
}: AppDependencies) {
  return (
    <I18nContext>
      <AppContextProvider value={{ licenseEnabled, notifications, http, formatAngularHttpError }}>
        <Main />
      </AppContextProvider>
    </I18nContext>
  );
}
