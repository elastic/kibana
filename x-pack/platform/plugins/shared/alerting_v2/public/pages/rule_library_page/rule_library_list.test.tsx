/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreateRuleData, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { CONTENT_LIST_TEST_SUBJECTS } from '@kbn/content-list-common';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RuleLibraryList } from './rule_library_list';

const mockFindItems = jest.fn();
const mockInstallMutate = jest.fn();
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
        http: { basePath: { prepend: (path: string) => path } },
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

jest.mock('../../hooks/use_install_rule_template', () => ({
  useInstallRuleTemplate: () => ({
    mutate: mockInstallMutate,
    isLoading: mockInstallIsLoading,
    variables: mockInstallVariables,
  }),
}));

const mockInstalledCounts = new Map<string, number>();

jest.mock('../../hooks/use_installed_rule_counts', () => ({
  useInstalledRuleCounts: () => ({ counts: mockInstalledCounts, isLoading: false }),
}));

const createRulePayload = (overrides: Partial<CreateRuleData> = {}): CreateRuleData =>
  ({
    kind: 'signal',
    metadata: { name: 'CPU usage', description: 'High CPU', tags: ['prod'] },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    query: { format: 'standalone', breach: { query: 'FROM metrics-*' } },
    ...overrides,
  } as CreateRuleData);

const createTemplate = (overrides: Partial<RuleTemplateResponse> = {}): RuleTemplateResponse => ({
  id: 'template-1',
  engine: 'v2',
  rule: createRulePayload(),
  ...overrides,
});

const renderList = () =>
  render(
    <ListPageTestProviders>
      <RuleLibraryList />
    </ListPageTestProviders>
  );

describe('RuleLibraryList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanWriteRules = true;
    mockInstallIsLoading = false;
    mockInstallVariables = undefined;
    mockInstalledCounts.clear();
    mockFindItems.mockResolvedValue({ items: [], total: 0 });
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

  describe('Installed column', () => {
    it('shows a dash when no rules are installed from the template', async () => {
      const template = createTemplate({ id: 'tpl-zero' });
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

      await waitFor(() => {
        expect(screen.getByText('\u2014')).toBeInTheDocument();
      });
    });

    it('shows the count as a link when rules are installed from the template', async () => {
      mockInstalledCounts.set('template-1', 5);
      const template = createTemplate({ id: 'template-1' });
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

      const link = await screen.findByRole('link', { name: '5' });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toContain('has_reference_type=alerting_rule_template');
      expect(link.getAttribute('href')).toContain('has_reference_id=template-1');
    });
  });
});
