/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { renderWithI18n as baseRenderWithI18n } from '@kbn/test-jest-helpers';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';

const wrapWithMlContext = (ui: React.ReactElement) => (
  <MockAppHeaderProvider>{ui}</MockAppHeaderProvider>
);

export const renderWithI18n = (
  ui: React.ReactElement,
  options?: Parameters<typeof baseRenderWithI18n>[1]
) => baseRenderWithI18n(wrapWithMlContext(ui), options);

export const renderWithMlContext = (ui: React.ReactElement, options?: RenderOptions) =>
  render(wrapWithMlContext(ui), options);

export const renderWithMlI18nContext = (ui: React.ReactElement, options?: RenderOptions) =>
  render(
    <IntlProvider locale="en">
      <MockAppHeaderProvider>{ui}</MockAppHeaderProvider>
    </IntlProvider>,
    options
  );
