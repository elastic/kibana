/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { MockAuthenticatedUserProps } from '@kbn/core-security-common/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { CAN_MONITOR_ALL_INDICES_CAPABILITY, PLUGIN_ID } from '../common/constants';
import { renderWithHomeContext } from './test_utils';
import { useAuthenticatedUser } from './hooks/use_authenticated_user';
import { useDeploymentStats } from './hooks/use_deployment_stats';
import { HomePageBanner } from './components/home_page_banner';
import { HomePage } from './home_page';

jest.mock('./hooks/use_authenticated_user', () => ({ useAuthenticatedUser: jest.fn() }));
jest.mock('./hooks/use_deployment_stats', () => ({ useDeploymentStats: jest.fn() }));

jest.mock('@kbn/shared-components', () => ({
  TrialUsageBadge: () => <div data-test-subj="trialUsageBadge" />,
}));

jest.mock('./components/home_page_banner', () => ({ HomePageBanner: jest.fn(() => null) }));
jest.mock('./components/add_data_section', () => ({
  AddDataSection: () => <div data-test-subj="addDataSection" />,
}));
jest.mock('./components/chat_with_data_section', () => ({
  ChatWithYourDataSection: () => <div data-test-subj="chatWithDataSection" />,
}));
jest.mock('./components/connection_details', () => ({
  ConnectionDetails: () => <div data-test-subj="connectionDetails" />,
}));

const mockUseAuthenticatedUser = useAuthenticatedUser as jest.Mock;
const mockUseDeploymentStats = useDeploymentStats as jest.Mock;
const mockHomePageBanner = jest.mocked(HomePageBanner);

const DOCS_URL = 'https://elastic.co/docs/vector-database';
const DOCS_LABEL = 'Learn more about Elasticsearch Vector Database';

const fullAccess = { showPanel: true, showDocuments: true, showTotalSize: true };

const stats = {
  dataPanelAccess: fullAccess,
  indicesCount: 3,
  documentsCount: 42,
  vectorCount: 120,
  storeSizeBytes: 2048,
  dashboardsCount: 5,
  starredDashboardsCount: 4,
  workflowsCount: 9,
  workflowsRunningCount: 6,
  apiKeysCount: 7,
  expiringApiKeysCount: 8,
};

const emptyStats = {
  dataPanelAccess: fullAccess,
  indicesCount: 0,
  documentsCount: 0,
  vectorCount: 0,
  storeSizeBytes: 0,
  dashboardsCount: 0,
  starredDashboardsCount: 0,
  workflowsCount: 0,
  workflowsRunningCount: 0,
  apiKeysCount: 0,
  expiringApiKeysCount: 0,
};

describe('HomePage', () => {
  const ALL_NAV_LINKS = [
    'management:index_management',
    'dashboards',
    'workflows',
    'management:api_keys',
  ];

  const renderHomePage = ({
    isInTrial = false,
    isServerlessEnabled = false,
    isServerless = false,
    canMonitorAllIndices = true,
    canReadWorkflow = true,
    navLinks = ALL_NAV_LINKS,
    config = {},
  }: {
    isInTrial?: boolean;
    isServerlessEnabled?: boolean;
    isServerless?: boolean;
    canMonitorAllIndices?: boolean;
    canReadWorkflow?: boolean;
    navLinks?: string[];
    config?: object;
  } = {}) => {
    const cloud = cloudMock.createStart();
    cloud.isInTrial.mockReturnValue(isInTrial);
    cloud.isServerlessEnabled = isServerlessEnabled;

    const application = applicationServiceMock.createStartContract();
    application.capabilities = {
      ...application.capabilities,
      [PLUGIN_ID]: { [CAN_MONITOR_ALL_INDICES_CAPABILITY]: canMonitorAllIndices },
      workflowsManagement: { readWorkflow: canReadWorkflow },
    };

    const chrome = chromeServiceMock.createStartContract();
    chrome.navLinks.has.mockImplementation((id: string) => navLinks.includes(id));

    return renderWithHomeContext(<HomePage />, {
      services: { cloud, application, chrome, isServerless },
      config: { docsLink: { href: DOCS_URL, label: DOCS_LABEL }, ...config },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthenticatedUser.mockReturnValue({ user: undefined });
    mockUseDeploymentStats.mockReturnValue({ stats, isLoading: false });
    mockHomePageBanner.mockImplementation(() => null);
  });

  describe('the header section', () => {
    const user = (overrides: MockAuthenticatedUserProps) =>
      mockUseAuthenticatedUser.mockReturnValue({
        user: securityServiceMock.createMockAuthenticatedUser(overrides),
      });

    it('greets the user by full name', () => {
      user({ full_name: 'Jane Doe', email: 'jane@elastic.co' });

      renderHomePage();

      expect(screen.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeInTheDocument();
    });

    it('falls back to the email when there is no full name', () => {
      user({ full_name: '', email: 'jane@elastic.co' });

      renderHomePage();

      expect(screen.getByRole('heading', { name: 'Welcome, jane@elastic.co' })).toBeInTheDocument();
    });

    it('greets an unidentified user without a name', () => {
      mockUseAuthenticatedUser.mockReturnValue({ user: undefined });

      renderHomePage();

      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    });

    it('always offers the connection details, without the host supplying them', () => {
      renderHomePage();

      expect(screen.getByTestId('connectionDetails')).toBeInTheDocument();
    });
  });

  describe('the documentation link', () => {
    it('uses the href and label the host supplied', () => {
      renderHomePage();

      const link = screen.getByTestId('elasticsearchHomeDocumentationLink');
      expect(link).toHaveAttribute('href', DOCS_URL);
      expect(link).toHaveTextContent(DOCS_LABEL);
    });

    it('is namespaced under the host telemetry prefix', () => {
      renderHomePage();

      expect(screen.getByTestId('elasticsearchHomeDocumentationLink')).toHaveAttribute(
        'data-telemetry-id',
        'testHost-home-documentationLink'
      );
    });

    it('falls back to the Elasticsearch docs when the host supplies none', () => {
      renderHomePage({ config: { docsLink: undefined } });

      const link = screen.getByTestId('elasticsearchHomeDocumentationLink');
      expect(link).toHaveAttribute(
        'href',
        docLinksServiceMock.createStartContract().links.elasticsearch.docsBase
      );
      expect(link).toHaveTextContent('Learn more about Elasticsearch');
    });
  });

  describe('the trial badge', () => {
    it('is shown while a Cloud Hosted deployment is in trial', () => {
      renderHomePage({ isInTrial: true });

      expect(screen.getByTestId('trialUsageBadge')).toBeInTheDocument();
    });

    it('is hidden on Serverless, which shows the trial badge in the header', () => {
      renderHomePage({ isInTrial: true, isServerlessEnabled: true });

      expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
    });

    it('is hidden outside of a trial', () => {
      renderHomePage({ isInTrial: false });

      expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
    });
  });

  describe('the vectors stat', () => {
    it('is hidden while Elasticsearch cannot report dense vector counts on stateless', () => {
      renderHomePage();

      expect(screen.queryByTestId('homePageDataCard-vectors')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-totalIndices')).toBeInTheDocument();
    });
  });

  describe('the manage data action', () => {
    it('is shown to a role that can reach Index Management', () => {
      renderHomePage();

      expect(screen.getByTestId('homePageDataCardDataManagement')).toBeInTheDocument();
    });

    it('is hidden from a role without Index Management, which keeps the data card', () => {
      renderHomePage({
        navLinks: ALL_NAV_LINKS.filter((id) => id !== 'management:index_management'),
      });

      expect(screen.queryByTestId('homePageDataCardDataManagement')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-totalIndices')).toBeInTheDocument();
    });
  });

  describe('the data card', () => {
    const renderWithAccess = (dataPanelAccess: typeof fullAccess) => {
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...stats, dataPanelAccess },
        isLoading: false,
      });
      renderHomePage();
    };

    it('shows an info icon on the title when the host supplies a tooltip', () => {
      renderHomePage({ config: { dataCardTooltip: 'What these stats count' } });

      expect(screen.getByTestId('homePageDataCardTitleInfo')).toBeInTheDocument();
    });

    it('shows no info icon on the title when the host supplies no tooltip', () => {
      renderHomePage();

      expect(screen.getByTestId('homePageDataCard')).toBeInTheDocument();
      expect(screen.queryByTestId('homePageDataCardTitleInfo')).not.toBeInTheDocument();
    });

    it('shows every stat to a role that may see them all', () => {
      renderWithAccess(fullAccess);

      expect(screen.getByTestId('homePageDataCard-totalIndices')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-documents')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-totalSize')).toBeInTheDocument();
    });

    it('is dropped for a role Elasticsearch denies the index reads', () => {
      renderWithAccess({ showPanel: false, showDocuments: false, showTotalSize: false });

      expect(screen.queryByTestId('homePageDataCard')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDashboardsCard')).toBeInTheDocument();
    });

    it('is kept for a role without Index Management', () => {
      mockUseDeploymentStats.mockReturnValue({ stats, isLoading: false });
      renderHomePage({
        navLinks: ALL_NAV_LINKS.filter((id) => id !== 'management:index_management'),
      });

      expect(screen.getByTestId('homePageDataCard')).toBeInTheDocument();
    });

    it('drops the documents stat for a role that cannot read documents', () => {
      renderWithAccess({ ...fullAccess, showDocuments: false });

      expect(screen.queryByTestId('homePageDataCard-documents')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-totalIndices')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-totalSize')).toBeInTheDocument();
    });

    // a role with only `view_index_metadata` can count indices but read neither documents nor sizes
    it('is dropped when only one stat would be left', () => {
      renderWithAccess({ showPanel: true, showDocuments: false, showTotalSize: false });

      expect(screen.queryByTestId('homePageDataCard')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDashboardsCard')).toBeInTheDocument();
    });

    it('is kept with two stats', () => {
      renderWithAccess({ showPanel: true, showDocuments: true, showTotalSize: false });

      expect(screen.getByTestId('homePageDataCard-totalIndices')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-documents')).toBeInTheDocument();
    });

    it('drops the total size stat for a role that cannot monitor indices', () => {
      renderWithAccess({ ...fullAccess, showTotalSize: false });

      expect(screen.queryByTestId('homePageDataCard-totalSize')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-totalIndices')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-documents')).toBeInTheDocument();
    });
  });

  describe('while the stats load', () => {
    it('shows the header and one loading indicator in place of the rest of the page', () => {
      mockUseDeploymentStats.mockReturnValue({ stats, isLoading: true });

      renderHomePage();

      expect(screen.getByTestId('elasticsearchHomeHeaderLeftsideGroup')).toBeInTheDocument();
      expect(screen.getByTestId('connectionDetails')).toBeInTheDocument();
      expect(screen.getByTestId('homePageLoading')).toBeInTheDocument();
      expect(mockHomePageBanner).not.toHaveBeenCalled();
      expect(screen.queryByTestId('homePageDataCard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('homePageDashboardsCard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('homePageWorkflowsCard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('homePageApiKeysCard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('addDataSection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chatWithDataSection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('elasticsearchHomeDocumentationLink')).not.toBeInTheDocument();
    });

    it('replaces the loading indicator with the rest of the page once the stats arrive', () => {
      renderHomePage();

      expect(screen.queryByTestId('homePageLoading')).not.toBeInTheDocument();
      expect(mockHomePageBanner).toHaveBeenCalled();
      expect(screen.getByTestId('homePageDataCard')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDashboardsCard')).toBeInTheDocument();
      expect(screen.getByTestId('addDataSection')).toBeInTheDocument();
      expect(screen.getByTestId('chatWithDataSection')).toBeInTheDocument();
      expect(screen.getByTestId('elasticsearchHomeDocumentationLink')).toBeInTheDocument();
    });
  });

  describe('the secondary cards', () => {
    it('are all shown to a role that can reach every app they link to', () => {
      renderHomePage();

      expect(screen.getByTestId('homePageDashboardsCard')).toBeInTheDocument();
      expect(screen.getByTestId('homePageWorkflowsCard')).toBeInTheDocument();
      expect(screen.getByTestId('homePageApiKeysCard')).toBeInTheDocument();
    });

    it.each([
      ['homePageDashboardsCard', 'dashboards'],
      ['homePageWorkflowsCard', 'workflows'],
      ['homePageApiKeysCard', 'management:api_keys'],
    ])('drops %s when its app is not reachable', (cardTestSubj, navLinkId) => {
      renderHomePage({ navLinks: ALL_NAV_LINKS.filter((id) => id !== navLinkId) });

      expect(screen.queryByTestId(cardTestSubj)).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard')).toBeInTheDocument();
    });

    // the workflows app stays registered for users who cannot read workflows
    it('drops the workflows card without the read workflow privilege', () => {
      renderHomePage({ canReadWorkflow: false });

      expect(screen.queryByTestId('homePageWorkflowsCard')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDashboardsCard')).toBeInTheDocument();
    });
  });

  describe('the onboarding banner', () => {
    const bannerProps = () => mockHomePageBanner.mock.calls[0][0];

    it('receives hasData=true when there is at least one index', () => {
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...emptyStats, indicesCount: 1 },
        isLoading: false,
      });

      renderHomePage();

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: true }));
    });

    it('receives hasData=true when there is at least one vector', () => {
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...emptyStats, vectorCount: 1 },
        isLoading: false,
      });

      renderHomePage();

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: true }));
    });

    it('receives hasData=false when there are no indices and no vectors', () => {
      mockUseDeploymentStats.mockReturnValue({ stats: emptyStats, isLoading: false });

      renderHomePage();

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: false }));
    });

    it('receives hasData=true when the counts are unavailable', () => {
      // a user without access to the stats may well have data, so don't nudge them to set up
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...emptyStats, indicesCount: null, vectorCount: null },
        isLoading: false,
      });

      renderHomePage();

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: true }));
    });
  });
});
