/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getTriggersActionsManagementPath,
  getCreateRuleFromTemplateRoute,
} from '@kbn/rule-data-utils';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { V1RuleLibraryList } from './v1_rule_library_list';

const mockFindItems = jest.fn();
const mockNavigateToApp = jest.fn();
const mockUseFetchV1RuleTemplateTags = jest.fn();
const mockGetRuleTypes = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { navigateToApp: mockNavigateToApp };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('./v1_rule_templates_data_source', () => ({
  useV1RuleTemplatesDataSource: () => ({
    findItems: mockFindItems,
    debounceMs: 0,
  }),
}));

jest.mock('../../hooks/use_fetch_v1_rule_template_tags', () => ({
  useFetchV1RuleTemplateTags: (params: { search?: string }) =>
    mockUseFetchV1RuleTemplateTags(params),
}));

jest.mock('@kbn/response-ops-rules-apis/apis/get_rule_types', () => ({
  getRuleTypes: (...args: unknown[]) => mockGetRuleTypes(...args),
}));

const template = {
  id: 'template/1',
  name: 'CPU usage',
  description: 'High CPU',
  ruleTypeId: 'metrics.alert.threshold',
  tags: ['prod'],
};

const renderList = (urlSync?: boolean, initialEntries?: string[]) =>
  render(
    <ListPageTestProviders initialEntries={initialEntries}>
      <V1RuleLibraryList urlSync={urlSync} />
    </ListPageTestProviders>
  );

describe('V1RuleLibraryList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindItems.mockResolvedValue({ items: [], total: 0 });
    mockUseFetchV1RuleTemplateTags.mockReturnValue({
      data: ['prod'],
      isLoading: false,
      isError: false,
    });
    mockGetRuleTypes.mockResolvedValue([
      {
        id: template.ruleTypeId,
        authorizedConsumers: { stackAlerts: { all: true, read: true } },
      },
    ]);
  });

  it('ignores URL search and sort when urlSync is off', async () => {
    renderList(false, ['/?q=cpu&sort=tags:desc']);

    await waitFor(() => {
      expect(mockFindItems).toHaveBeenCalled();
    });

    const params = mockFindItems.mock.calls.at(-1)[0];
    expect(params.searchQuery).toBe('');
    expect(params.sort).toEqual({ field: 'name', direction: 'asc' });
  });

  it('renders the empty state when there are no templates', async () => {
    renderList();

    expect(await screen.findByTestId('v1RuleLibraryEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByText('No rule templates')).toBeInTheDocument();
  });

  it('renders classic templates with a Create action', async () => {
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.name,
          description: template.description,
          tags: template.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();

    expect(await screen.findByText('CPU usage')).toBeInTheDocument();
    expect(screen.getByText('High CPU')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('applies a selected tag filter', async () => {
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.name,
          description: template.description,
          tags: template.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();
    await screen.findByText('CPU usage');

    fireEvent.click(screen.getByTestId('v1RuleLibraryTagsFilter'));
    const options = await screen.findByTestId('v1RuleLibraryTagsFilter-list');
    fireEvent.click(within(options).getByText('prod'));

    await waitFor(() => {
      expect(mockFindItems.mock.calls.at(-1)[0].filters.tag).toMatchObject({ include: ['prod'] });
    });
  });

  it('opens the classic create-from-template form', async () => {
    const user = userEvent.setup();
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.name,
          description: template.description,
          tags: template.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();

    const createAction = await screen.findByTestId('ruleLibraryCreateAction');
    await waitFor(() => {
      expect(createAction).not.toHaveAttribute('aria-disabled', 'true');
    });
    await user.click(createAction);

    await waitFor(() => {
      expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
        path: getTriggersActionsManagementPath(
          getCreateRuleFromTemplateRoute(encodeURIComponent(template.id))
        ),
      });
    });
  });

  it('disables Create when the user has only classic read access to the rule type', async () => {
    mockGetRuleTypes.mockResolvedValue([
      {
        id: template.ruleTypeId,
        authorizedConsumers: { stackAlerts: { all: false, read: true } },
      },
    ]);
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.name,
          description: template.description,
          tags: template.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();

    const createAction = await screen.findByTestId('ruleLibraryCreateAction');
    await waitFor(() => {
      expect(createAction).toHaveAttribute('aria-disabled', 'true');
    });
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });
});
