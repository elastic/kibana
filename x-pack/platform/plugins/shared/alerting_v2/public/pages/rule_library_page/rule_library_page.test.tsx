/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { AppHeaderTab } from '@kbn/app-header';
import type { CreateRuleData, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RuleLibraryPage } from './rule_library_page';

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/app-header', () => ({
  APP_HEADER_TEST_SUBJECTS: { title: 'appHeaderTitle' },
  AppHeader: ({ title, tabs }: { title: string; tabs?: AppHeaderTab[] }) => (
    <div>
      <h1 data-test-subj="appHeaderTitle">{title}</h1>
      <span data-test-subj="alertingV2ExperimentalBadge" />
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

let mockCanAccessV2 = true;
let mockCanAccessV1 = false;

const mockGetRuleTemplate = jest.fn();
const mockOpenCreateFromTemplateFlyout = jest.fn();

jest.mock('@kbn/core-di-browser', () => {
  const { RuleTemplatesApi: ActualRuleTemplatesApi } = jest.requireActual(
    '../../services/rule_templates_api'
  );
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualRuleTemplatesApi) {
        return { getRuleTemplate: mockGetRuleTemplate };
      }
      if (token === ActualUserCapabilities) {
        return {
          canRead: (feature: string) => feature === 'rules' && mockCanAccessV2,
        };
      }
      if (token === 'application') {
        return {
          capabilities: {
            management: mockCanAccessV1
              ? { insightsAndAlerting: { triggersActionsRules: true } }
              : {},
          },
        };
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
  RuleLibraryList: ({ urlSync = true }: { urlSync?: boolean }) => (
    <div data-test-subj="mockedRuleLibraryList" data-url-sync={String(urlSync)} />
  ),
}));

jest.mock('./v1_rule_library_list', () => ({
  V1RuleLibraryList: ({ urlSync = true }: { urlSync?: boolean }) => (
    <div data-test-subj="mockedV1RuleLibraryList" data-url-sync={String(urlSync)} />
  ),
}));

const mockCreatePayload: CreateRuleData = {
  kind: 'signal',
  metadata: { name: 'CPU usage' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { base: 'FROM logs-*' },
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
    mockCanAccessV2 = true;
    mockCanAccessV1 = false;
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

  it('shows V2 and V1 tabs when the user can access both, with V2 selected', async () => {
    mockCanAccessV1 = true;
    renderPage();

    const v2Tab = await screen.findByTestId('ruleLibraryV2Tab');
    const v1Tab = screen.getByTestId('ruleLibraryV1Tab');

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(v2Tab).toHaveAttribute('aria-selected', 'true');
    expect(v1Tab).toHaveAttribute('aria-selected', 'false');
    expect(v2Tab).toHaveTextContent('V2');
    expect(v1Tab).toHaveTextContent('V1');
    expect(screen.getByTestId('mockedRuleLibraryList')).toHaveAttribute('data-url-sync', 'false');
    expect(screen.queryByTestId('mockedV1RuleLibraryList')).not.toBeInTheDocument();
  });

  it('hides the tab strip when the user can access only v2 rules', () => {
    renderPage();

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockedRuleLibraryList')).toHaveAttribute('data-url-sync', 'true');
  });

  it('hides the tab strip and the v2 list when the user can access only v1 rules', () => {
    mockCanAccessV2 = false;
    mockCanAccessV1 = true;
    renderPage();

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockedRuleLibraryList')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockedV1RuleLibraryList')).toHaveAttribute('data-url-sync', 'true');
  });

  it('switches to the v1 tab and unmounts the v2 list', async () => {
    mockCanAccessV1 = true;
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByTestId('ruleLibraryV1Tab'));

    expect(screen.getByTestId('ruleLibraryV1Tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('ruleLibraryV2Tab')).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByTestId('mockedRuleLibraryList')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockedV1RuleLibraryList')).toHaveAttribute('data-url-sync', 'false');
  });

  it('opens the v2 flyout from templateId after the user returns from the v1 tab', async () => {
    mockCanAccessV1 = true;
    let resolveTemplate: (template: RuleTemplateResponse) => void = () => {};
    mockGetRuleTemplate.mockReturnValue(
      new Promise((resolve) => {
        resolveTemplate = resolve;
      })
    );
    const user = userEvent.setup();
    renderPage(['/?q=cpu&templateId=template-1']);

    await waitFor(() => {
      expect(mockGetRuleTemplate).toHaveBeenCalledWith('template-1');
    });

    await user.click(await screen.findByTestId('ruleLibraryV1Tab'));
    resolveTemplate(mockTemplate);

    await waitFor(() => {
      expect(screen.getByTestId('mockedV1RuleLibraryList')).toBeInTheDocument();
    });
    expect(mockOpenCreateFromTemplateFlyout).not.toHaveBeenCalled();
    expect(screen.queryByTestId('composeDiscoverFlyout')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('ruleLibraryV2Tab'));

    await waitFor(() => {
      expect(mockOpenCreateFromTemplateFlyout).toHaveBeenCalledWith(mockTemplate);
    });
    expect(screen.getByTestId('composeDiscoverFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('mockedRuleLibraryList')).toBeInTheDocument();
  });

  it('does not open the v2 flyout from templateId while the v1 library is showing', async () => {
    mockCanAccessV2 = false;
    mockCanAccessV1 = true;
    renderPage(['/?templateId=template-1']);

    await waitFor(() => {
      expect(screen.queryByTestId('mockedRuleLibraryList')).not.toBeInTheDocument();
    });
    expect(mockGetRuleTemplate).not.toHaveBeenCalled();
    expect(mockOpenCreateFromTemplateFlyout).not.toHaveBeenCalled();
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
