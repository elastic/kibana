/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleCreateOptionsPanel } from './rule_create_options_panel';

const onCreateEsqlRule = jest.fn();

const renderPanel = () =>
  render(
    <I18nProvider>
      <RuleCreateOptionsPanel onCreateEsqlRule={onCreateEsqlRule} />
    </I18nProvider>
  );

describe('RuleCreateOptionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('calls onCreateEsqlRule when the "Create ES|QL rule" card is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /create es\|ql rule/i }));

    expect(onCreateEsqlRule).toHaveBeenCalledTimes(1);
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
