/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import { ALERTING_V2_RULES_BASE_PATH } from '@kbn/alerting-v2-constants';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { TabsProvider } from '../../application/tabs_context';
import { V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY } from '../../hooks/use_v2_rules_tab_new_badge';
import { RulesListHeader } from './rules_list_header';

let mockPhase: 'initialLoad' | 'empty' | 'populated' | 'filtering' | 'filtered' = 'populated';
let mockCanReadV1Rules = true;
let mockAreAgentBuilderSkillsAvailable = true;
let mockAgentBuilderSkillsRequirements = {
  hasAgentBuilderCapability: true,
};

/** Non-empty so the assertions below prove each href is run through `basePath.prepend`. */
const MOCK_BASE_PATH = '/mock-base';

jest.mock('@kbn/content-list-provider', () => {
  const actual = jest.requireActual('@kbn/content-list-provider');
  return {
    ...actual,
    useContentListPhase: () => mockPhase,
  };
});

jest.mock('@kbn/core-di-browser', () => {
  const actual = jest.requireActual('@kbn/core-di-browser');
  return {
    ...actual,
    useService: (token: symbol) => {
      if (token === actual.CoreStart('application')) {
        return {
          capabilities: {
            management: mockCanReadV1Rules
              ? { insightsAndAlerting: { triggersActionsRules: true } }
              : {},
          },
        };
      }

      if (token === actual.CoreStart('http')) {
        return { basePath: { prepend: (path: string) => `${MOCK_BASE_PATH}${path}` } };
      }

      if (token === actual.CoreStart('docLinks')) {
        return {
          links: {
            alerting: {
              viewManageRules: 'https://docs.test/view-manage-rules',
            },
          },
        };
      }

      return {};
    },
  };
});

jest.mock('../../hooks/use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => mockAreAgentBuilderSkillsAvailable,
  useAgentBuilderSkillsRequirements: () => mockAgentBuilderSkillsRequirements,
}));

const onCreateRule = jest.fn();
const onCreateEsqlRule = jest.fn();
const onCreateWithAgent = jest.fn();

const renderHeader = (props?: Partial<React.ComponentProps<typeof RulesListHeader>>) =>
  render(
    <ListPageTestProviders>
      <RulesListHeader
        canWrite={true}
        onCreateRule={onCreateRule}
        onCreateEsqlRule={onCreateEsqlRule}
        onCreateWithAgent={onCreateWithAgent}
        {...props}
      />
    </ListPageTestProviders>
  );

describe('RulesListHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.removeItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY);
    mockPhase = 'populated';
    mockCanReadV1Rules = true;
    mockAreAgentBuilderSkillsAvailable = true;
    mockAgentBuilderSkillsRequirements = {
      hasAgentBuilderCapability: true,
    };
  });

  it('renders V1 rules and V2 rules tabs with V2 selected', async () => {
    renderHeader();

    const v1Tab = await screen.findByTestId('v1RulesTab');
    const v2Tab = await screen.findByTestId('v2RulesTab');

    expect(v1Tab).toHaveAttribute('aria-selected', 'false');
    expect(v2Tab).toHaveAttribute('aria-selected', 'true');
    expect(v1Tab).toHaveTextContent('Classic');
    expect(v2Tab).toHaveTextContent('Universal');
    expect(await screen.findAllByRole('tab')).toHaveLength(2);
  });

  it('shows a primary new-dot on Universal until it has been visited', async () => {
    const { unmount } = renderHeader();

    const v2Tab = await screen.findByTestId('v2RulesTab');
    expect(v2Tab.querySelector('[data-euiicon-type="dot"]')).toBeInTheDocument();

    unmount();
    localStorage.setItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY, JSON.stringify(true));
    renderHeader();

    expect(screen.getByTestId('v2RulesTab').querySelector('[data-euiicon-type="dot"]')).toBeNull();
  });

  it('orders the Universal tab before the Classic tab', async () => {
    renderHeader();

    const tabs = await screen.findAllByRole('tab');

    expect(tabs.map((tab) => tab.getAttribute('data-test-subj'))).toEqual([
      'v2RulesTab',
      'v1RulesTab',
    ]);
  });

  it('points each tab at its own app, under the server base path', async () => {
    renderHeader();

    expect(await screen.findByTestId('v2RulesTab')).toHaveAttribute(
      'href',
      `${MOCK_BASE_PATH}${ALERTING_V2_RULES_BASE_PATH}`
    );
    expect(await screen.findByTestId('v1RulesTab')).toHaveAttribute(
      'href',
      `${MOCK_BASE_PATH}${triggersActionsRoute}`
    );
  });

  it('hides the tab strip when the user cannot read the v1 Rules page', () => {
    mockCanReadV1Rules = false;
    renderHeader();

    expect(screen.queryByTestId('v1RulesTab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('v2RulesTab')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('renders the tabs even in the true empty state, unlike the create menu', () => {
    mockPhase = 'empty';
    renderHeader();

    expect(screen.getByTestId('v1RulesTab')).toBeInTheDocument();
    expect(screen.getByTestId('v2RulesTab')).toBeInTheDocument();
    expect(screen.queryByTestId('createRuleButton')).not.toBeInTheDocument();
  });

  it('renders host-provided tabs instead of management hrefs', async () => {
    const hostTabs = [
      {
        id: 'v2Rules',
        label: 'V2 rules',
        isSelected: true,
        href: '/obs/rules/v2',
        'data-test-subj': 'v2RulesTab',
      },
      {
        id: 'v1Rules',
        label: 'V1 rules',
        isSelected: false,
        href: '/obs/rules/v1',
        'data-test-subj': 'v1RulesTab',
      },
    ];

    render(
      <ListPageTestProviders>
        <TabsProvider tabs={hostTabs}>
          <RulesListHeader
            canWrite={true}
            onCreateRule={onCreateRule}
            onCreateEsqlRule={onCreateEsqlRule}
            onCreateWithAgent={onCreateWithAgent}
          />
        </TabsProvider>
      </ListPageTestProviders>
    );

    expect(await screen.findByTestId('v2RulesTab')).toHaveAttribute('href', '/obs/rules/v2');
    expect(await screen.findByTestId('v1RulesTab')).toHaveAttribute('href', '/obs/rules/v1');
    expect(screen.getByTestId('v2RulesTab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('v1RulesTab')).toHaveAttribute('aria-selected', 'false');
  });
});
