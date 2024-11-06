/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiDarkVars } from '@kbn/ui-theme';
import { ThemeProvider } from '@emotion/react';

interface Props {
  children?: React.ReactNode;
}

/** A utility for wrapping children in the providers required to run most tests */
export const TestProvidersComponent: React.FC<Props> = ({ children }) => {
  return (
    <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>{children}</ThemeProvider>
  );
};

export const TestProviders = React.memo(TestProvidersComponent);
