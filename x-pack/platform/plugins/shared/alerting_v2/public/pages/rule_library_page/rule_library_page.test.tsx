/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RuleLibraryPage } from './rule_library_page';

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    const services: Record<string, unknown> = {
      chrome: { docTitle: { change: jest.fn() } },
    };
    return services[token as string] ?? {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('./rule_library_list', () => ({
  RuleLibraryList: () => <div data-test-subj="mockedRuleLibraryList" />,
}));

const renderPage = () =>
  render(
    <ListPageTestProviders>
      <RuleLibraryPage />
    </ListPageTestProviders>
  );

describe('RuleLibraryPage', () => {
  it('renders the page title and experimental badge', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Rule library');
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
  });

  it('renders the rule library list', () => {
    renderPage();

    expect(screen.getByTestId('mockedRuleLibraryList')).toBeInTheDocument();
  });
});
