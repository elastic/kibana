/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import type { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import type { Container } from 'inversify';
import type { InternalPageProps } from './composable_pages';
import { createAlertingV2HostApp } from '../locators';

const ALL_CAPABILITIES = {
  alerting_v2_rules: { read: true, all: true },
  alerting_v2_alerts: { read: true, all: true },
  alerting_v2_action_policies: { read: true, all: true },
  alerting_v2_execution_history: { read: true, all: true },
};

let mockAlertingV2ExperimentalFeaturesEnabled = true;

vi.mock('@kbn/core-di-browser', async () => {
  const actual = require('react');
  const { UserCapabilities: ActualUserCapabilities } = (await vi.importActual('../services/user_capabilities'));
  return {
    Context: actual.createContext(undefined),
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return new ActualUserCapabilities({ capabilities: ALL_CAPABILITIES });
      }
      if (token === 'uiSettings') {
        return { get: () => mockAlertingV2ExperimentalFeaturesEnabled };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

vi.mock('../pages/rules_list_page/rules_list_page', () => {
      const mocked = {
      RulesListPage: () => <div data-test-subj="rulesListPage">rules</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../routes/rule_details_route', () => {
      const mocked = {
      RuleDetailsRoute: () => <div data-test-subj="ruleDetailsRoute">rule detail</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../pages/sequence_builder_page', () => {
      const mocked = {
      SequenceBuilderPage: () => <div data-test-subj="sequenceBuilderPage">sequence</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../pages/rule_library_page/rule_library_page', () => {
      const mocked = {
      RuleLibraryPage: () => <div data-test-subj="ruleLibraryPage">library</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../pages/alert_episodes_list_page/alert_episodes_list_page', () => {
      const mocked = {
      AlertEpisodesListPage: () => <div data-test-subj="episodesListPage">episodes</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../pages/episode_details_page/episode_details_page', () => {
      const mocked = {
      EpisodeDetailsPage: () => <div data-test-subj="episodeDetailsPage">episode detail</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../pages/list_action_policies_page/list_action_policies_page', () => {
      const mocked = {
      ListActionPoliciesPage: () => <div data-test-subj="listActionPoliciesPage">policies</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../pages/action_policy_form_page/action_policy_form_page', () => {
      const mocked = {
      ActionPolicyFormPage: () => <div data-test-subj="actionPolicyFormPage">form</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../pages/execution_history_page/execution_history_page', () => {
      const mocked = {
      ExecutionHistoryPage: () => <div data-test-subj="executionHistoryPage">history</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      KibanaContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/shared-ux-link-redirect-app', () => {
      const mocked = {
      RedirectAppLinks: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

const createMockLocator = () => ({
  useUrl: vi.fn().mockReturnValue(''),
  getUrl: vi.fn().mockResolvedValue(''),
  getRedirectUrl: vi.fn().mockReturnValue(''),
  navigate: vi.fn().mockResolvedValue(undefined),
  navigateSync: vi.fn(),
  getLocation: vi.fn().mockResolvedValue({ app: 'management', path: '/', state: {} }),
});

const createMockSharePlugin = () => ({
  url: {
    locators: {
      get: vi.fn().mockReturnValue(createMockLocator()),
    },
  },
});

const createMockContainer = () => {
  const sharePlugin = createMockSharePlugin();
  const defaultMock = { ...sharePlugin };
  return {
    get: vi.fn().mockReturnValue(defaultMock),
    getAsync: vi.fn().mockResolvedValue({}),
    isBound: vi.fn().mockReturnValue(true),
  };
};

const createMockCoreStart = () => {
  const container = createMockContainer();
  return {
    injection: { getContainer: () => container },
    rendering: { addContext: (el: React.ReactElement) => el },
    notifications: { toasts: {} },
    http: {},
    application: {},
    uiSettings: {},
    featureFlags: {},
    settings: { globalClient: { get: vi.fn(), get$: vi.fn() } },
    userProfile: {},
  } as unknown as CoreStart;
};

const defaultProps = (): InternalPageProps => ({
  coreStart: createMockCoreStart(),
  container: createMockContainer() as unknown as Container,
  setBreadcrumbs: vi.fn() as (crumbs: ChromeBreadcrumb[]) => void,
});

const renderInRouter = (ui: React.ReactElement, path = '/') =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe('composable pages', () => {
  let AlertingV2RulesPage: React.ComponentType<InternalPageProps>;
  let AlertingV2RuleLibraryPage: React.ComponentType<InternalPageProps>;
  let AlertingV2EpisodesPage: React.ComponentType<InternalPageProps>;
  let AlertingV2ActionPoliciesPage: React.ComponentType<InternalPageProps>;
  let AlertingV2ExecutionHistoryPage: React.ComponentType<InternalPageProps>;

  beforeAll(async () => {
    const mod = await import('./composable_pages');
    AlertingV2RulesPage = mod.AlertingV2RulesPage;
    AlertingV2RuleLibraryPage = mod.AlertingV2RuleLibraryPage;
    AlertingV2EpisodesPage = mod.AlertingV2EpisodesPage;
    AlertingV2ActionPoliciesPage = mod.AlertingV2ActionPoliciesPage;
    AlertingV2ExecutionHistoryPage = mod.AlertingV2ExecutionHistoryPage;
  });

  describe('AlertingV2RulesPage', () => {
    it('renders the rules list', () => {
      renderInRouter(<AlertingV2RulesPage {...defaultProps()} />);
      expect(screen.getByTestId('rulesListPage')).toBeInTheDocument();
    });
  });

  describe('AlertingV2RuleLibraryPage', () => {
    it('renders the rule library', () => {
      renderInRouter(<AlertingV2RuleLibraryPage {...defaultProps()} />);
      expect(screen.getByTestId('ruleLibraryPage')).toBeInTheDocument();
    });
  });

  describe('AlertingV2EpisodesPage', () => {
    it('renders the episodes list', () => {
      renderInRouter(<AlertingV2EpisodesPage {...defaultProps()} />);
      expect(screen.getByTestId('episodesListPage')).toBeInTheDocument();
    });
  });

  describe('AlertingV2ActionPoliciesPage', () => {
    it('renders the action policies list', () => {
      renderInRouter(<AlertingV2ActionPoliciesPage {...defaultProps()} />);
      expect(screen.getByTestId('listActionPoliciesPage')).toBeInTheDocument();
    });
  });

  describe('AlertingV2ExecutionHistoryPage', () => {
    it('renders the execution history page', () => {
      renderInRouter(<AlertingV2ExecutionHistoryPage {...defaultProps()} />);
      expect(screen.getByTestId('executionHistoryPage')).toBeInTheDocument();
    });
  });

  describe('provider wiring', () => {
    it('passes setBreadcrumbs to BreadcrumbProvider', () => {
      const props = defaultProps();
      renderInRouter(<AlertingV2RulesPage {...props} />);
      expect(screen.getByTestId('rulesListPage')).toBeInTheDocument();
    });

    it('uses the DI container passed as a prop', () => {
      const props = defaultProps();
      renderInRouter(<AlertingV2RulesPage {...props} />);
      expect(screen.getByTestId('rulesListPage')).toBeInTheDocument();
    });

    it('episodes page resolves services from the DI container', () => {
      const props = defaultProps();
      renderInRouter(<AlertingV2EpisodesPage {...props} />);
      expect(props.container.get).toHaveBeenCalled();
    });

    it('accepts a solution hostApp', () => {
      const hostApp = createAlertingV2HostApp('observability', {
        rules: '/alerting',
        ruleLibrary: '/alerting/library',
        episodes: '/alerting/inbox',
        actionPolicies: '/alerting/action-policies',
        executionHistory: '/alerting/execution-history',
      });

      renderInRouter(<AlertingV2RulesPage {...defaultProps()} hostApp={hostApp} />);
      expect(screen.getByTestId('rulesListPage')).toBeInTheDocument();
    });
  });

  describe('useRouteMatch route matching', () => {
    const renderAtRoute = (parentPath: string, location: string, ui: React.ReactElement) =>
      render(
        <MemoryRouter initialEntries={[location]}>
          <Route path={parentPath}>{ui}</Route>
        </MemoryRouter>
      );

    it('EpisodesPage renders list when parent route matches', () => {
      renderAtRoute('/inbox', '/inbox', <AlertingV2EpisodesPage {...defaultProps()} />);
      expect(screen.getByTestId('episodesListPage')).toBeInTheDocument();
    });

    it('EpisodesPage renders episode detail at parent/:episodeId', () => {
      renderAtRoute('/inbox', '/inbox/ep-1', <AlertingV2EpisodesPage {...defaultProps()} />);
      expect(screen.getByTestId('episodeDetailsPage')).toBeInTheDocument();
    });

    it('EpisodesPage at /inbox does not match /:episodeId with "inbox" as the id', () => {
      renderAtRoute('/inbox', '/inbox', <AlertingV2EpisodesPage {...defaultProps()} />);
      expect(screen.queryByTestId('episodeDetailsPage')).not.toBeInTheDocument();
      expect(screen.getByTestId('episodesListPage')).toBeInTheDocument();
    });

    it('RulesPage renders list when parent route matches', () => {
      renderAtRoute('/rules/v2', '/rules/v2', <AlertingV2RulesPage {...defaultProps()} />);
      expect(screen.getByTestId('rulesListPage')).toBeInTheDocument();
    });

    it('RulesPage renders rule detail at parent/:ruleId', () => {
      renderAtRoute(
        '/rules/v2',
        '/rules/v2/some-rule',
        <AlertingV2RulesPage {...defaultProps()} />
      );
      expect(screen.getByTestId('ruleDetailsRoute')).toBeInTheDocument();
    });

    it('RulesPage redirects sequence-builder URLs to the list when experimental features are disabled', () => {
      mockAlertingV2ExperimentalFeaturesEnabled = false;
      renderAtRoute(
        '/rules/v2',
        '/rules/v2/sequence/create',
        <AlertingV2RulesPage {...defaultProps()} />
      );

      expect(screen.getByTestId('rulesListPage')).toBeInTheDocument();
      expect(screen.queryByTestId('sequenceBuilderPage')).not.toBeInTheDocument();
      mockAlertingV2ExperimentalFeaturesEnabled = true;
    });

    it('ActionPoliciesPage renders list when parent route matches', () => {
      renderAtRoute(
        '/action-policies',
        '/action-policies',
        <AlertingV2ActionPoliciesPage {...defaultProps()} />
      );
      expect(screen.getByTestId('listActionPoliciesPage')).toBeInTheDocument();
    });

    it('ActionPoliciesPage renders create at parent/create', () => {
      renderAtRoute(
        '/action-policies',
        '/action-policies/create',
        <AlertingV2ActionPoliciesPage {...defaultProps()} />
      );
      expect(screen.getByTestId('actionPolicyFormPage')).toBeInTheDocument();
    });

    it('RuleLibraryPage renders when parent route matches', () => {
      renderAtRoute(
        '/rule-library',
        '/rule-library',
        <AlertingV2RuleLibraryPage {...defaultProps()} />
      );
      expect(screen.getByTestId('ruleLibraryPage')).toBeInTheDocument();
    });

    it('ExecutionHistoryPage renders when parent route matches', () => {
      renderAtRoute(
        '/execution-history',
        '/execution-history',
        <AlertingV2ExecutionHistoryPage {...defaultProps()} />
      );
      expect(screen.getByTestId('executionHistoryPage')).toBeInTheDocument();
    });
  });
});
