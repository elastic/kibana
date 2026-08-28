/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { CreateRuleData, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RuleLibraryPage } from './rule_library_page';

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/app-header', () => ({
  APP_HEADER_TEST_SUBJECTS: { title: 'appHeaderTitle' },
  AppHeader: ({ title }: { title: string }) => (
    <div>
      <h1 data-test-subj="appHeaderTitle">{title}</h1>
      <span data-test-subj="alertingV2ExperimentalBadge" />
    </div>
  ),
}));

const mockGetRuleTemplate = jest.fn();
const mockOpenCreateFromTemplateFlyout = jest.fn();

jest.mock('@kbn/core-di-browser', () => {
  const { RuleTemplatesApi: ActualRuleTemplatesApi } = jest.requireActual(
    '../../services/rule_templates_api'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualRuleTemplatesApi) {
        return { getRuleTemplate: mockGetRuleTemplate };
      }
      const services: Record<string, unknown> = {
        chrome: { docTitle: { change: jest.fn() } },
      };
      return services[token as string] ?? {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('../../hooks/use_compose_discover_flyout', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  return {
    useComposeDiscoverFlyout: () => {
      const [flyout, setFlyout] = ReactActual.useState<React.ReactNode>(null);
      return {
        flyout,
        openCreateFromTemplateFlyout: (...args: unknown[]) => {
          mockOpenCreateFromTemplateFlyout(...args);
          setFlyout(
            ReactActual.createElement('div', { 'data-test-subj': 'composeDiscoverFlyout' })
          );
        },
      };
    },
  };
});

jest.mock('./rule_library_list', () => ({
  RuleLibraryList: () => <div data-test-subj="mockedRuleLibraryList" />,
}));

const mockCreatePayload: CreateRuleData = {
  kind: 'signal',
  metadata: { name: 'CPU usage' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
};

const mockTemplate: RuleTemplateResponse = {
  id: 'template-1',
  engine: 'v2',
  rule: mockCreatePayload,
};

const renderPage = (initialEntries?: string[]) =>
  render(
    <ListPageTestProviders initialEntries={initialEntries}>
      <RuleLibraryPage />
    </ListPageTestProviders>
  );

describe('RuleLibraryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRuleTemplate.mockResolvedValue(mockTemplate);
  });

  it('renders the page title and experimental badge', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Rule library');
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
  });

  it('renders the rule library list', () => {
    renderPage();

    expect(screen.getByTestId('mockedRuleLibraryList')).toBeInTheDocument();
  });

  it('opens the create flyout prepopulated from template.rule when templateId is in the URL', async () => {
    renderPage(['/?templateId=template-1']);

    await waitFor(() => {
      expect(mockGetRuleTemplate).toHaveBeenCalledWith('template-1');
      expect(mockOpenCreateFromTemplateFlyout).toHaveBeenCalledWith(mockTemplate);
    });
    expect(screen.getByTestId('composeDiscoverFlyout')).toBeInTheDocument();
  });

  it('does not open the flyout when templateId is absent', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('mockedRuleLibraryList')).toBeInTheDocument();
    });
    expect(mockGetRuleTemplate).not.toHaveBeenCalled();
    expect(mockOpenCreateFromTemplateFlyout).not.toHaveBeenCalled();
    expect(screen.queryByTestId('composeDiscoverFlyout')).not.toBeInTheDocument();
  });
});
