/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { euiDarkVars } from '@kbn/ui-theme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { DataQualityProvider } from '../../data_quality_panel/data_quality_context';

interface Props {
  children: React.ReactNode;
}

window.scrollTo = jest.fn();

/** A utility for wrapping children in the providers required to run tests */
export const TestProvidersComponent: React.FC<Props> = ({ children }) => {
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });

  return (
    <I18nProvider>
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <DataQualityProvider httpFetch={http.fetch}>{children}</DataQualityProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

TestProvidersComponent.displayName = 'TestProvidersComponent';

export const TestProviders = React.memo(TestProvidersComponent);
