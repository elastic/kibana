/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { ListActionPoliciesPage } from './list_action_policies_page';

const mockNavigateToUrl = jest.fn();

const WRITE_CAPABILITIES = { alerting_v2_action_policies: { read: true, all: true } };
const READ_ONLY_CAPABILITIES = { alerting_v2_action_policies: { read: true, all: false } };
let mockCapabilities: Record<string, Record<string, boolean>> = WRITE_CAPABILITIES;

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return new ActualUserCapabilities({ capabilities: mockCapabilities });
      }
      if (token === 'application') {
        return { navigateToUrl: mockNavigateToUrl };
      }
      if (token === 'chrome') {
        return { docTitle: { change: jest.fn() } };
      }
      if (token === 'http') {
        return { basePath: { prepend: (path: string) => path } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('./components/action_policies_table', () => ({
  ActionPoliciesTable: () => <div data-test-subj="mockedActionPoliciesTable" />,
}));

const renderPage = () =>
  render(
    <ListPageTestProviders>
      <ListActionPoliciesPage />
    </ListPageTestProviders>
  );

describe('ListActionPoliciesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities = WRITE_CAPABILITIES;
  });

  it('renders the action policies table', () => {
    renderPage();

    expect(screen.getByTestId('mockedActionPoliciesTable')).toBeInTheDocument();
  });

  it('renders the experimental badge in the page header', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Action Policies');
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
  });

  it('navigates to create action policy when the create button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('createActionPolicyButton'));

    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/app/management/alertingV2/action_policies/create'
    );
  });

  describe('when the user has write privilege', () => {
    it('renders the create button', () => {
      renderPage();

      expect(screen.getByTestId('createActionPolicyButton')).toBeInTheDocument();
    });
  });

  describe('when the user only has read privilege', () => {
    beforeEach(() => {
      mockCapabilities = READ_ONLY_CAPABILITIES;
    });

    it('hides the create button', () => {
      renderPage();

      expect(screen.queryByTestId('createActionPolicyButton')).toBeNull();
    });
  });
});
