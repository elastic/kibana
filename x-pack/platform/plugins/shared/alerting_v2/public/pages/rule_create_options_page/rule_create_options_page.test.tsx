/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleCreateOptionsPage } from './rule_create_options_page';
import { paths } from '../../constants';

const mockNavigateToUrl = jest.fn();

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    if (token === 'notifications') {
      return {};
    }
    if (token === 'application') {
      return { navigateToUrl: mockNavigateToUrl };
    }
    if (token === 'chrome') {
      return { docTitle: { change: jest.fn() } };
    }
    if (token === 'data' || token === 'dataViews' || token === 'lens') {
      return {};
    }
    throw new Error(`Unexpected token in useService mock: ${String(token)}`);
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => key,
}));

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  ComposeDiscoverFlyout: ({ onCreateRule }: { onCreateRule: (payload: unknown) => void }) => (
    <button data-test-subj="composeDiscoverFlyout" onClick={() => onCreateRule({})}>
      Compose Discover flyout
    </button>
  ),
}));

const mockCreateRuleMutate = jest.fn();
jest.mock('../../hooks/use_create_rule', () => ({
  useCreateRule: () => ({ mutate: mockCreateRuleMutate, isLoading: false }),
}));

const mockUpdateRuleMutate = jest.fn();
jest.mock('../../hooks/use_update_rule', () => ({
  useUpdateRule: () => ({ mutate: mockUpdateRuleMutate, isLoading: false }),
}));

const renderPage = () =>
  render(
    <I18nProvider>
      <RuleCreateOptionsPage />
    </I18nProvider>
  );

describe('RuleCreateOptionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRuleMutate.mockImplementation((_payload, options) => options?.onSuccess?.());
  });

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

  it('opens the flyout when the ES|QL rule card is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /create es\|ql rule/i }));

    expect(screen.getByTestId('composeDiscoverFlyout')).toBeInTheDocument();
  });

  it('navigates to the rules list after creating a rule from the flyout', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /create es\|ql rule/i }));
    fireEvent.click(screen.getByTestId('composeDiscoverFlyout'));

    expect(mockNavigateToUrl).toHaveBeenCalledWith(paths.ruleList);
  });
});
