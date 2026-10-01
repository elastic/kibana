/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppHeaderTab } from '@kbn/app-header';
import type { CreateRuleData, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { getContentListToolbarSubjects } from '@kbn/content-list-common';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RuleLibraryPage } from './rule_library_page';

const mockFindV2 = jest.fn();
const mockFindV1 = jest.fn();

let mockCanAccessV2 = true;
let mockCanAccessV1 = true;

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/app-header', () => ({
  APP_HEADER_TEST_SUBJECTS: { title: 'appHeaderTitle' },
  AppHeader: ({ title, tabs }: { title: string; tabs?: AppHeaderTab[] }) => (
    <div>
      <h1>{title}</h1>
      {tabs?.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.isSelected}
          data-test-subj={tab['data-test-subj']}
          onClick={tab.onClick}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return {
          canRead: (feature: string) => feature === 'rules' && mockCanAccessV2,
          canWrite: () => true,
          can: () => true,
        };
      }
      if (token === 'application') {
        return {
          navigateToApp: jest.fn(),
          capabilities: {
            management: mockCanAccessV1
              ? { insightsAndAlerting: { triggersActionsRules: true } }
              : {},
          },
        };
      }
      if (token === 'notifications') {
        return { toasts: { addError: jest.fn(), addSuccess: jest.fn() } };
      }
      if (token === 'chrome') {
        return { docTitle: { change: jest.fn() } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('./rule_templates_data_source', () => ({
  ...jest.requireActual('./rule_templates_data_source'),
  useRuleTemplatesDataSource: () => ({
    findItems: mockFindV2,
    debounceMs: 0,
  }),
}));

jest.mock('./v1_rule_templates_data_source', () => ({
  useV1RuleTemplatesDataSource: () => ({
    findItems: mockFindV1,
    debounceMs: 0,
  }),
}));

jest.mock('../../hooks/use_compose_discover_flyout', () => ({
  useComposeDiscoverFlyout: () => ({
    flyout: null,
    openCreateFromTemplateFlyout: jest.fn(),
  }),
}));

const v2Rule = {
  kind: 'signal',
  metadata: { name: 'V2 template', description: 'v2 description', tags: ['prod'] },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { base: 'FROM metrics-*' },
} as CreateRuleData;

const v2Template: RuleTemplateResponse = {
  id: 'v2-template',
  engine: 'v2',
  rule: v2Rule,
};

const v1Template = {
  id: 'v1-template',
  name: 'V1 template',
  description: 'v1 description',
  ruleTypeId: 'metrics.alert.threshold',
  tags: ['classic'],
};

const renderPage = (initialEntries?: string[]) =>
  render(
    <ListPageTestProviders initialEntries={initialEntries}>
      <RuleLibraryPage />
    </ListPageTestProviders>
  );

const expectIsolatedQuery = (params: {
  searchQuery: string;
  filters: { tag?: { include: string[] } };
  sort?: { field: string; direction: string };
}) => {
  expect(params.searchQuery).toBe('');
  expect(params.filters.tag).toBeUndefined();
  expect(params.sort).toEqual({ field: 'name', direction: 'asc' });
};

describe('Rule library tab isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanAccessV2 = true;
    mockCanAccessV1 = true;
    mockFindV2.mockResolvedValue({
      items: [
        {
          id: v2Template.id,
          title: 'V2 template',
          description: 'v2 description',
          tags: ['prod'],
          template: v2Template,
        },
      ],
      total: 1,
    });
    mockFindV1.mockResolvedValue({
      items: [
        {
          id: v1Template.id,
          title: 'V1 template',
          description: 'v1 description',
          tags: ['classic'],
          template: v1Template,
        },
      ],
      total: 1,
    });
  });

  it('keeps v2 URL search and sort when only v2 is available', async () => {
    mockCanAccessV1 = false;
    renderPage(['/?q=cpu&sort=tags:desc']);

    await waitFor(() => {
      const params = mockFindV2.mock.calls.at(-1)?.[0];
      expect(params.searchQuery).toBe('cpu');
      expect(params.sort).toEqual({ field: 'tags', direction: 'desc' });
    });
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
    expect(mockFindV1).not.toHaveBeenCalled();
  });

  it('does not reuse search, tags, or results when switching tabs', async () => {
    const user = userEvent.setup();
    renderPage(['/?q=cpu&sort=tags:desc']);

    expect(await screen.findByText('V2 template')).toBeInTheDocument();
    await waitFor(() => {
      expectIsolatedQuery(mockFindV2.mock.calls.at(-1)[0]);
    });
    expect(screen.queryByText('V1 template')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();

    const searchBox = screen.getByTestId(getContentListToolbarSubjects().searchBox);
    await user.type(searchBox, 'tag:prod alpha');

    await waitFor(() => {
      expect(mockFindV2.mock.calls.at(-1)[0].searchQuery).toBe('tag:prod alpha');
    });

    await user.click(screen.getByTestId('ruleLibraryV1Tab'));

    expect(await screen.findByText('V1 template')).toBeInTheDocument();
    expect(screen.queryByText('V2 template')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    expect(mockFindV1.mock.calls.length).toBeGreaterThan(0);
    for (const [params] of mockFindV1.mock.calls) {
      expectIsolatedQuery(params);
    }

    await user.type(screen.getByTestId(getContentListToolbarSubjects().searchBox), 'beta');
    await waitFor(() => {
      expect(mockFindV1.mock.calls.at(-1)[0].searchQuery).toBe('beta');
    });

    const v2CallsBeforeReturn = mockFindV2.mock.calls.length;
    await user.click(screen.getByTestId('ruleLibraryV2Tab'));

    expect(await screen.findByText('V2 template')).toBeInTheDocument();
    expect(screen.queryByText('V1 template')).not.toBeInTheDocument();
    const callsAfterReturn = mockFindV2.mock.calls.slice(v2CallsBeforeReturn);
    expect(callsAfterReturn.length).toBeGreaterThan(0);
    for (const [params] of callsAfterReturn) {
      expect(params.searchQuery).not.toBe('beta');
      expect(params.searchQuery).not.toBe('tag:prod alpha');
      expectIsolatedQuery(params);
    }
  });
});
