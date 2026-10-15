/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import type { CreateRuleData, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { CONTENT_LIST_TEST_SUBJECTS } from '@kbn/content-list-common';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RuleLibraryList } from './rule_library_list';

jest.setTimeout(20_000);

const mockFindItems = jest.fn();
const mockInstallMutate = jest.fn();
const mockUseFetchRuleTemplateTags = jest.fn();
let mockCanWriteRules = true;
let mockInstallIsLoading = false;
let mockInstallVariables: { id: string } | undefined;

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return {
          canWrite: (feature: string) => (feature === 'rules' ? mockCanWriteRules : true),
          canRead: () => true,
          can: () => mockCanWriteRules,
        };
      }

      const services: Record<string, unknown> = {
        notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      };

      return services[token as string] ?? {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('./rule_templates_data_source', () => ({
  ...jest.requireActual('./rule_templates_data_source'),
  useRuleTemplatesDataSource: () => ({
    findItems: mockFindItems,
    debounceMs: 0,
  }),
}));

jest.mock('../../hooks/use_fetch_rule_template_tags', () => ({
  useFetchRuleTemplateTags: (params: { search?: string }) => mockUseFetchRuleTemplateTags(params),
}));

jest.mock('../../hooks/use_install_rule_template', () => ({
  useInstallRuleTemplate: () => ({
    mutate: mockInstallMutate,
    isLoading: mockInstallIsLoading,
    variables: mockInstallVariables,
  }),
}));

const createRulePayload = (overrides: Partial<CreateRuleData> = {}): CreateRuleData =>
  ({
    kind: 'signal',
    metadata: { name: 'CPU usage', description: 'High CPU', tags: ['prod'] },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    query: { base: 'FROM metrics-*' },
    ...overrides,
  } as CreateRuleData);

const createTemplate = (overrides: Partial<RuleTemplateResponse> = {}): RuleTemplateResponse => ({
  id: 'template-1',
  engine: 'v2',
  rule: createRulePayload(),
  ...overrides,
});

const renderList = (initialEntries?: string[]) =>
  render(
    <ListPageTestProviders initialEntries={initialEntries}>
      <RuleLibraryList />
    </ListPageTestProviders>
  );

const tagFilterEntry = (tags: string[]) =>
  `/?q=${encodeURIComponent(`tag:(${tags.join(' or ')})`)}`;

const lastFindItemsArgs = () => {
  const { calls } = mockFindItems.mock;
  return calls[calls.length - 1][0];
};

const resolveTemplateList = () => {
  const template = createTemplate();
  mockFindItems.mockResolvedValue({
    items: [{ id: template.id, title: template.rule.metadata.name, template }],
    total: 1,
  });
};

describe('RuleLibraryList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanWriteRules = true;
    mockInstallIsLoading = false;
    mockInstallVariables = undefined;
    mockFindItems.mockResolvedValue({ items: [], total: 0 });
    mockUseFetchRuleTemplateTags.mockReturnValue({
      data: ['nginx'],
      isLoading: false,
      isError: false,
    });
  });

  it('renders the empty-state placeholder when there are no templates', async () => {
    renderList();

    expect(await screen.findByTestId('ruleLibraryEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByText('No rule templates')).toBeInTheDocument();
  });

  it('renders fetched templates in the content list', async () => {
    const template = createTemplate();
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.rule.metadata.name,
          description: template.rule.metadata.description,
          tags: template.rule.metadata.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();

    expect(await screen.findByText('CPU usage')).toBeInTheDocument();
    expect(screen.getByText('High CPU')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
    expect(screen.getByTestId(CONTENT_LIST_TEST_SUBJECTS.table)).toBeInTheDocument();
  });

  it('offers tags from the aggregation even when absent from the listed templates', async () => {
    const template = createTemplate();
    mockFindItems.mockResolvedValue({
      items: [{ id: template.id, title: template.rule.metadata.name, template }],
      total: 1,
    });
    renderList();
    await screen.findByText('CPU usage');

    fireEvent.click(screen.getByTestId('ruleLibraryTagsFilter'));
    const options = await screen.findByTestId('ruleLibraryTagsFilter-list');
    expect(within(options).getByText('nginx')).toBeInTheDocument();
    expect(within(options).queryByText('prod')).not.toBeInTheDocument();
  });

  it('shows an error when tags cannot be loaded', async () => {
    mockUseFetchRuleTemplateTags.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    resolveTemplateList();
    renderList();
    await screen.findByText('CPU usage');

    fireEvent.click(screen.getByTestId('ruleLibraryTagsFilter'));

    expect(await screen.findByText('Unable to load tags')).toBeInTheDocument();
  });

  it('applies and clears a selected tag filter', async () => {
    resolveTemplateList();
    renderList();
    await screen.findByText('CPU usage');

    fireEvent.click(screen.getByTestId('ruleLibraryTagsFilter'));
    const options = await screen.findByTestId('ruleLibraryTagsFilter-list');
    expect(screen.getByTestId('ruleLibraryTagsFilterSearch')).toHaveAttribute(
      'maxLength',
      String(MAX_TAG_LENGTH)
    );
    expect(screen.getByRole('searchbox', { name: 'Search tags' })).toBeInTheDocument();
    fireEvent.click(within(options).getByText('nginx'));

    await waitFor(() => {
      expect(lastFindItemsArgs().filters.tag).toMatchObject({ include: ['nginx'] });
    });

    fireEvent.click(screen.getByTestId('ruleLibraryTagsFilter-clear'));

    await waitFor(() => {
      expect(lastFindItemsArgs().filters.tag).toBeUndefined();
    });
  });

  it('keeps selected tags available while searching for other options', async () => {
    mockUseFetchRuleTemplateTags.mockImplementation(({ search }: { search?: string }) => ({
      data: search === 'kube' ? ['kubernetes'] : ['nginx'],
      isLoading: false,
      isError: false,
    }));
    resolveTemplateList();
    renderList();
    await screen.findByText('CPU usage');

    fireEvent.click(screen.getByTestId('ruleLibraryTagsFilter'));
    const options = await screen.findByTestId('ruleLibraryTagsFilter-list');
    fireEvent.click(within(options).getByText('nginx'));
    fireEvent.change(screen.getByTestId('ruleLibraryTagsFilterSearch'), {
      target: { value: 'kube' },
    });

    await waitFor(() => {
      expect(mockUseFetchRuleTemplateTags).toHaveBeenCalledWith({ search: 'kube' });
    });
    expect(within(options).getByText('nginx')).toBeInTheDocument();
    expect(within(options).getByText('kubernetes')).toBeInTheDocument();
  });

  it('hides additional search results after reaching the tag selection limit', async () => {
    const selectedTags = Array.from({ length: MAX_TAGS }, (_, index) => `tag-${index + 1}`);
    const additionalTag = `tag-${MAX_TAGS + 1}`;
    mockUseFetchRuleTemplateTags.mockImplementation(({ search }: { search?: string }) => ({
      data: search === additionalTag ? [additionalTag] : selectedTags,
      isLoading: false,
      isError: false,
    }));
    const selectionLimitMessage = `Maximum of ${MAX_TAGS} tags selected. Remove one to select another.`;
    resolveTemplateList();
    renderList([tagFilterEntry(selectedTags)]);
    await screen.findByText('CPU usage');

    fireEvent.click(screen.getByTestId('ruleLibraryTagsFilter'));
    const options = await screen.findByTestId('ruleLibraryTagsFilter-list');

    const tagToExclude = within(options).getByText(selectedTags[5]);
    fireEvent.mouseDown(tagToExclude, { ctrlKey: true });
    fireEvent.click(tagToExclude, { ctrlKey: true });

    expect(tagToExclude.closest('[role="option"]')).toHaveAttribute('aria-posinset', '6');

    fireEvent.change(screen.getByTestId('ruleLibraryTagsFilterSearch'), {
      target: { value: additionalTag },
    });
    await waitFor(() => {
      expect(mockUseFetchRuleTemplateTags).toHaveBeenCalledWith({ search: additionalTag });
    });

    expect(within(options).queryByText(additionalTag)).not.toBeInTheDocument();
    expect(screen.getByText(selectionLimitMessage)).toBeInTheDocument();

    const tagToRemove = within(options).getByText(selectedTags[0]);
    fireEvent.mouseDown(tagToRemove);
    fireEvent.click(tagToRemove);

    expect(screen.queryByText(selectionLimitMessage)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ruleLibraryTagsFilter-clear'));

    expect(await within(options).findByText(additionalTag)).toBeInTheDocument();
  });

  it('installs a template from the row action', async () => {
    const user = userEvent.setup();
    const template = createTemplate();
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.rule.metadata.name,
          description: template.rule.metadata.description,
          tags: template.rule.metadata.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();

    const installAction = await screen.findByTestId('ruleLibraryInstallAction');
    await user.click(installAction);

    await waitFor(() => {
      expect(mockInstallMutate).toHaveBeenCalledWith(template);
    });
  });

  it('disables install when the user cannot write rules', async () => {
    mockCanWriteRules = false;
    const template = createTemplate();
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.rule.metadata.name,
          description: template.rule.metadata.description,
          tags: template.rule.metadata.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();

    const installAction = await screen.findByTestId('ruleLibraryInstallAction');
    expect(installAction).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a loading install action while a template is installing', async () => {
    mockInstallIsLoading = true;
    mockInstallVariables = { id: 'template-1' };
    const template = createTemplate();
    mockFindItems.mockResolvedValue({
      items: [
        {
          id: template.id,
          title: template.rule.metadata.name,
          description: template.rule.metadata.description,
          tags: template.rule.metadata.tags,
          template,
        },
      ],
      total: 1,
    });

    renderList();

    const installAction = await screen.findByTestId('ruleLibraryInstallAction');
    expect(installAction).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('ruleLibraryInstallLoading')).toBeInTheDocument();
  });
});
