/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter, Route } from 'react-router-dom';
import { PrivilegeCheckProvider, type PrivilegeCheck } from './privilege_check_context';
import { RuleLibraryApp } from './rule_library_app';

let mockCanAccessV1 = false;
let mockCanAccessV2 = true;

jest.mock('../pages/rule_library_page/rule_library_page', () => ({
  RuleLibraryPage: () => <div data-test-subj="ruleLibraryPage" />,
}));

jest.mock('../pages/rule_library_page/use_rule_library_access', () => ({
  useRuleLibraryAccess: () => ({
    canAccessV1: mockCanAccessV1,
    canAccessV2: mockCanAccessV2,
  }),
}));

const renderApp = (privilegeCheck?: PrivilegeCheck) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/rule-library']}>
        <PrivilegeCheckProvider value={privilegeCheck}>
          <Route path="/rule-library">
            <RuleLibraryApp />
          </Route>
        </PrivilegeCheckProvider>
      </MemoryRouter>
    </I18nProvider>
  );

describe('RuleLibraryApp', () => {
  beforeEach(() => {
    mockCanAccessV1 = false;
    mockCanAccessV2 = true;
  });

  it('renders the library when the user can read v2 rules', () => {
    renderApp();

    expect(screen.getByTestId('ruleLibraryPage')).toBeInTheDocument();
  });

  it('renders the library when the user can access only v1 rules', () => {
    mockCanAccessV2 = false;
    mockCanAccessV1 = true;
    renderApp();

    expect(screen.getByTestId('ruleLibraryPage')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingRequiredPrivilegesPrompt')).not.toBeInTheDocument();
  });

  it('shows the privileges prompt when the user can access neither rule type', () => {
    mockCanAccessV2 = false;
    mockCanAccessV1 = false;
    renderApp();

    expect(screen.queryByTestId('ruleLibraryPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertingRequiredPrivilegesPrompt')).toBeInTheDocument();
  });

  it('uses a host privilege check as the sole access decision', () => {
    mockCanAccessV2 = true;
    renderApp(() => false);

    expect(screen.queryByTestId('ruleLibraryPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertingRequiredPrivilegesPrompt')).toBeInTheDocument();
  });
});
