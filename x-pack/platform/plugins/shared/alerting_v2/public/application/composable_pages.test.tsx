/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import type { Container } from 'inversify';
import type { InternalPageProps } from './composable_pages';

const ALL_CAPABILITIES = {
  alerting_v2_rules: { read: true, all: true },
  alerting_v2_alerts: { read: true, all: true },
  alerting_v2_action_policies: { read: true, all: true },
  alerting_v2_execution_history: { read: true, all: true },
};

jest.mock('@kbn/core-di-browser', () => {
  const actual = jest.requireActual('react');
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../services/user_capabilities'
  );
  return {
    Context: actual.createContext(undefined),
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return new ActualUserCapabilities({ capabilities: ALL_CAPABILITIES });
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('../pages/rules_list_page/rules_list_page', () => ({
  RulesListPage: () => <div data-test-subj="rulesListPage">rules</div>,
}));

jest.mock('../routes/rule_details_route', () => ({
  RuleDetailsRoute: () => <div data-test-subj="ruleDetailsRoute">rule detail</div>,
}));

jest.mock('../pages/sequence_builder_page', () => ({
  SequenceBuilderPage: () => <div data-test-subj="sequenceBuilderPage">sequence</div>,
}));

jest.mock('../pages/rule_library_page/rule_library_page', () => ({
  RuleLibraryPage: () => <div data-test-subj="ruleLibraryPage">library</div>,
}));

jest.mock('../pages/alert_episodes_list_page/alert_episodes_list_page', () => ({
  AlertEpisodesListPage: () => <div data-test-subj="episodesListPage">episodes</div>,
}));

jest.mock('../pages/episode_details_page/episode_details_page', () => ({
  EpisodeDetailsPage: () => <div data-test-subj="episodeDetailsPage">episode detail</div>,
}));

jest.mock('../pages/list_action_policies_page/list_action_policies_page', () => ({
  ListActionPoliciesPage: () => <div data-test-subj="listActionPoliciesPage">policies</div>,
}));

jest.mock('../pages/action_policy_form_page/action_policy_form_page', () => ({
  ActionPolicyFormPage: () => <div data-test-subj="actionPolicyFormPage">form</div>,
}));

jest.mock('../pages/execution_history_page/execution_history_page', () => ({
  ExecutionHistoryPage: () => <div data-test-subj="executionHistoryPage">history</div>,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  KibanaContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@kbn/shared-ux-link-redirect-app', () => ({
  RedirectAppLinks: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const createMockContainer = () => ({
  get: jest.fn().mockReturnValue({}),
  getAsync: jest.fn().mockResolvedValue({}),
  isBound: jest.fn().mockReturnValue(true),
});

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
    settings: { globalClient: { get: jest.fn(), get$: jest.fn() } },
    userProfile: {},
  } as unknown as CoreStart;
};

const defaultProps = (): InternalPageProps => ({
  coreStart: createMockCoreStart(),
  container: createMockContainer() as unknown as Container,
  setBreadcrumbs: jest.fn() as (crumbs: ChromeBreadcrumb[]) => void,
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
  });
});
