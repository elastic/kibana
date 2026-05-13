/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleCreateOptionsPanel } from './rule_create_options_panel';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    throw new Error(`Unexpected service token in test: ${String(token)}`);
  },
  CoreStart: (key: string) => key,
}));

const renderPanel = () =>
  render(
    <I18nProvider>
      <RuleCreateOptionsPanel />
    </I18nProvider>
  );

describe('RuleCreateOptionsPanel', () => {
  it('renders the welcome title', () => {
    renderPanel();

    expect(
      screen.getByRole('heading', { level: 2, name: /welcome to the new alerting experience/i })
    ).toBeInTheDocument();
  });

  it('renders the description text', () => {
    renderPanel();

    expect(screen.getByText(/powerful es\|ql-driven rules/i)).toBeInTheDocument();
  });

  it('renders the "Create ES|QL rule" card with correct href', () => {
    renderPanel();

    const card = screen.getByRole('link', { name: /create es\|ql rule/i });
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/app/management/alertingV2/rules/create');
  });

  it('renders the "Create with AI Agent" card as disabled and non-interactive', () => {
    renderPanel();

    expect(screen.getByText('Create with AI Agent')).toBeInTheDocument();
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the "Threshold Alert" card as coming soon', () => {
    renderPanel();

    expect(screen.getByText('Threshold Alert')).toBeInTheDocument();
  });
});
