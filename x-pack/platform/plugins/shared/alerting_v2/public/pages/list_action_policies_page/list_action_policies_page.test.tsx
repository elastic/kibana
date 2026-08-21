/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { ListActionPoliciesPage } from './list_action_policies_page';

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'chrome') {
      return { docTitle: { change: jest.fn() }, setBreadcrumbs: jest.fn() };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

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
  it('renders the action policies table', () => {
    renderPage();

    expect(screen.getByTestId('mockedActionPoliciesTable')).toBeInTheDocument();
  });
});
