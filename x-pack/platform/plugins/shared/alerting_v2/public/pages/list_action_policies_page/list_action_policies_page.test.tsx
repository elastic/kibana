/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { ListActionPoliciesPage } from './list_action_policies_page';

vi.mock('../../application/breadcrumb_context', () => {
      const mocked = {
      useSetBreadcrumbs: () => vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/core-di-browser', () => {
      const mocked = {
      useService: (token: unknown) => {
        if (token === 'chrome') {
          return { docTitle: { change: vi.fn() }, setBreadcrumbs: vi.fn() };
        }
        return {};
      },
      CoreStart: (key: string) => key,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/action_policies_table', () => {
      const mocked = {
      ActionPoliciesTable: () => <div data-test-subj="mockedActionPoliciesTable" />,
    };
      return { ...mocked, default: mocked };
    });

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
