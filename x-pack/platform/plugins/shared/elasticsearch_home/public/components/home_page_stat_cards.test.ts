/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { DeploymentStats } from '../hooks/use_deployment_stats';
import { getDataCard, getSecondaryCards } from './home_page_stat_cards';

const ALL_NAV_LINKS = [
  'management:index_management',
  'dashboards',
  'workflows',
  'management:api_keys',
];

interface Permissions {
  canCreateDashboard?: boolean;
  canCreateWorkflow?: boolean;
  canSaveApiKey?: boolean;
}

interface DepsOptions extends Permissions {
  dataPanelAccess?: DeploymentStats['dataPanelAccess'];
  navLinks?: string[];
}

const createDeps = ({
  canCreateDashboard = true,
  canCreateWorkflow = true,
  canSaveApiKey = true,
  dataPanelAccess = { showPanel: true, showDocuments: true, showTotalSize: true },
  navLinks = ALL_NAV_LINKS,
}: DepsOptions = {}) => {
  const application = applicationServiceMock.createStartContract();
  application.capabilities = {
    ...application.capabilities,
    dashboard_v2: { createNew: canCreateDashboard },
    workflowsManagement: { readWorkflow: true, createWorkflow: canCreateWorkflow },
    api_keys: { save: canSaveApiKey },
  };

  const chrome = chromeServiceMock.createStartContract();
  chrome.navLinks.has.mockImplementation((id: string) => navLinks.includes(id));

  return {
    application,
    chrome,
    stats: {
      dataPanelAccess,
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
      newIndex: null,
    },
    getTelemetryId: (suffix: string) => `testHost-home-${suffix}`,
  };
};

const getCards = (permissions: Permissions = {}) => getSecondaryCards(createDeps(permissions));

const actionKeys = (cards: ReturnType<typeof getCards>, testSubj: string) =>
  cards.find((card) => card.testSubj === testSubj)?.actions.map(({ key }) => key);

describe('getDataCard', () => {
  it('shows every permitted metric and the manage data action', () => {
    const card = getDataCard(createDeps());

    expect(card?.metrics.map(({ key }) => key)).toEqual(['totalIndices', 'documents', 'totalSize']);
    expect(card?.actions.map(({ key }) => key)).toEqual(['viewIndices']);
  });

  it.each([
    {
      hidden: 'documents',
      dataPanelAccess: { showPanel: true, showDocuments: false, showTotalSize: true },
      expected: ['totalIndices', 'totalSize'],
    },
    {
      hidden: 'total size',
      dataPanelAccess: { showPanel: true, showDocuments: true, showTotalSize: false },
      expected: ['totalIndices', 'documents'],
    },
  ])('drops the $hidden metric when the user cannot see it', ({ dataPanelAccess, expected }) => {
    const card = getDataCard(createDeps({ dataPanelAccess }));
    const metricKeys = card?.metrics.map(({ key }) => key);

    expect(metricKeys).toEqual(expected);
  });

  it('is null when only the index count would remain', () => {
    expect(
      getDataCard(
        createDeps({
          dataPanelAccess: { showPanel: true, showDocuments: false, showTotalSize: false },
        })
      )
    ).toBeNull();
  });

  it('is null when the data panel is not accessible', () => {
    expect(
      getDataCard(
        createDeps({
          dataPanelAccess: { showPanel: false, showDocuments: true, showTotalSize: true },
        })
      )
    ).toBeNull();
  });

  it('omits the manage data action without the index management nav link', () => {
    const card = getDataCard(
      createDeps({ navLinks: ALL_NAV_LINKS.filter((id) => id !== 'management:index_management') })
    );

    expect(card?.actions).toEqual([]);
  });
});

describe('getSecondaryCards', () => {
  it('offers create and manage actions to a role that can create', () => {
    const cards = getCards();

    expect(actionKeys(cards, 'homePageDashboardsCard')).toEqual([
      'createDashboard',
      'manageDashboards',
    ]);
    expect(actionKeys(cards, 'homePageWorkflowsCard')).toEqual([
      'createWorkflow',
      'manageWorkflows',
    ]);
    expect(actionKeys(cards, 'homePageApiKeysCard')).toEqual(['createApiKey', 'manageApiKeys']);
  });

  it.each([
    ['homePageDashboardsCard', { canCreateDashboard: false }, ['manageDashboards']],
    ['homePageWorkflowsCard', { canCreateWorkflow: false }, ['manageWorkflows']],
    ['homePageApiKeysCard', { canSaveApiKey: false }, ['manageApiKeys']],
  ])(
    'keeps only the manage action on %s for a read-only role',
    (testSubj, permissions, expected) => {
      expect(actionKeys(getCards(permissions), testSubj)).toEqual(expected);
    }
  );
});
