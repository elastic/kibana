/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';

const themeStub = {
  euiTheme: {
    colors: {
      primary: '#006BB4',
      success: '#017D73',
      subduedText: '#69707D',
    },
    border: { width: { thin: '1px' } },
    size: { base: '16px' },
  } as unknown as EuiThemeComputed<{}>,
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult =>
  render(ui, {
    wrapper: ({ children }) => (
      <EuiProvider>
        <ThemeProvider theme={themeStub}>
          <IntlProvider locale="en">{children}</IntlProvider>
        </ThemeProvider>
      </EuiProvider>
    ),
    ...options,
  });
