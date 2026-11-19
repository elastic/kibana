/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';
import { ActionPoliciesApp } from './action_policies_app';

const WRITE_CAPABILITIES = { alerting_v2_action_policies: { read: true, all: true } };
const READ_ONLY_CAPABILITIES = { alerting_v2_action_policies: { read: true, all: false } };
let mockCapabilities: Record<string, Record<string, boolean>> = WRITE_CAPABILITIES;

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return new ActualUserCapabilities({ capabilities: mockCapabilities });
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('../pages/list_action_policies_page/list_action_policies_page', () => ({
  ListActionPoliciesPage: () => <div data-test-subj="listActionPoliciesPage">list</div>,
}));

jest.mock('../pages/action_policy_form_page/action_policy_form_page', () => ({
  ActionPolicyFormPage: () => <div data-test-subj="actionPolicyFormPage">form</div>,
}));

const renderApp = (initialPath: string) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <ActionPoliciesApp />
      </MemoryRouter>
    </I18nProvider>
  );

describe('ActionPoliciesApp', () => {
  afterEach(() => {
    mockCapabilities = WRITE_CAPABILITIES;
  });

  describe('when the user has write privilege', () => {
    beforeEach(() => {
      mockCapabilities = WRITE_CAPABILITIES;
    });

    it('renders the create form', () => {
      renderApp('/create');
      expect(screen.getByTestId('actionPolicyFormPage')).toBeInTheDocument();
    });

    it('renders the edit form', () => {
      renderApp('/edit/policy-1');
      expect(screen.getByTestId('actionPolicyFormPage')).toBeInTheDocument();
    });

    it('renders the list page', () => {
      renderApp('/');
      expect(screen.getByTestId('listActionPoliciesPage')).toBeInTheDocument();
    });
  });

  describe('when the user only has read privilege', () => {
    beforeEach(() => {
      mockCapabilities = READ_ONLY_CAPABILITIES;
    });

    it('blocks the create form with the privileges interstitial', () => {
      renderApp('/create');
      expect(screen.queryByTestId('actionPolicyFormPage')).not.toBeInTheDocument();
      expect(screen.getByTestId('alertingRequiredPrivilegesPrompt')).toBeInTheDocument();
    });

    it('blocks the edit form with the privileges interstitial', () => {
      renderApp('/edit/policy-1');
      expect(screen.queryByTestId('actionPolicyFormPage')).not.toBeInTheDocument();
      expect(screen.getByTestId('alertingRequiredPrivilegesPrompt')).toBeInTheDocument();
    });

    it('still renders the list page', () => {
      renderApp('/');
      expect(screen.getByTestId('listActionPoliciesPage')).toBeInTheDocument();
    });
  });
});
