/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleCreateOptionsPage } from './rule_create_options_page';

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    if (token === 'chrome') {
      return { docTitle: { change: jest.fn() } };
    }
    throw new Error(`Unexpected token in useService mock: ${String(token)}`);
  },
  CoreStart: (key: string) => key,
}));

const renderPage = () =>
  render(
    <I18nProvider>
      <RuleCreateOptionsPage />
    </I18nProvider>
  );

describe('RuleCreateOptionsPage', () => {
  it('renders the page title', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Rules' })).toBeInTheDocument();
  });

  it('renders the RuleCreateOptionsPanel', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 2, name: /welcome to the new alerting experience/i })
    ).toBeInTheDocument();
  });

  it('renders the rule creation method cards', () => {
    renderPage();

    expect(screen.getByText('Create ES|QL rule')).toBeInTheDocument();
    expect(screen.getByText('Create with AI Agent')).toBeInTheDocument();
    expect(screen.getByText('Threshold Alert')).toBeInTheDocument();
  });
});
