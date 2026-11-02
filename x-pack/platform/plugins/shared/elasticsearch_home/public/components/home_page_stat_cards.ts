/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, ChromeStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  CAN_MONITOR_ALL_INDICES_CAPABILITY,
  PLUGIN_ID,
  VECTOR_COUNT_ENABLED,
} from '../../common/constants';
import type { DeploymentStats } from '../hooks/use_deployment_stats';
import { formatBytes, formatNumber } from '../utils/format';
import type { HomePageStatPanelProps } from './home_page_stat_panel';

interface StatCardDeps {
  application: ApplicationStart;
  chrome: ChromeStart;
  stats: DeploymentStats;
  isLoading: boolean;
  /** Namespaces a telemetry id under the hosting plugin's prefix. */
  getTelemetryId: (suffix: string) => string;
}

type HomePageStats = Omit<HomePageStatPanelProps, 'newIndex'>;

const INDEX_MANAGEMENT_NAV_LINK_ID = 'management:index_management';

const showVectorCount = ({ application }: Pick<StatCardDeps, 'application'>): boolean =>
  VECTOR_COUNT_ENABLED &&
  application.capabilities[PLUGIN_ID]?.[CAN_MONITOR_ALL_INDICES_CAPABILITY] === true;

const showIndexManagement = ({ chrome }: Pick<StatCardDeps, 'chrome'>): boolean =>
  chrome.navLinks.has(INDEX_MANAGEMENT_NAV_LINK_ID);

export const getDataCard = ({
  application,
  chrome,
  stats,
  isLoading,
  getTelemetryId,
}: StatCardDeps): HomePageStats => ({
  iconType: 'database',
  title: i18n.translate('xpack.elasticsearchHome.home.dataCard.title', {
    defaultMessage: 'Data',
  }),
  testSubj: 'homePageDataCard',
  showPrimary: true,
  metrics: [
    {
      key: 'totalIndices',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.totalIndicesLabel', {
        defaultMessage: 'Total indices',
      }),
      value: formatNumber(stats.indicesCount),
      isLoading,
    },
    {
      key: 'documents',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.documentsLabel', {
        defaultMessage: 'Documents',
      }),
      value: formatNumber(stats.documentsCount),
      isLoading,
    },
    ...(showVectorCount({ application })
      ? [
          {
            key: 'vectors',
            label: i18n.translate('xpack.elasticsearchHome.home.stats.vectorsLabel', {
              defaultMessage: 'Vectors',
            }),
            value: formatNumber(stats.vectorCount),
            isLoading,
          },
        ]
      : []),
    {
      key: 'totalSize',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.totalSizeLabel', {
        defaultMessage: 'Total size',
      }),
      value: formatBytes(stats.storeSizeBytes),
      isLoading,
    },
  ],
  actions: showIndexManagement({ chrome })
    ? [
        {
          key: 'viewIndices',
          label: i18n.translate('xpack.elasticsearchHome.home.dataCard.dataManagement', {
            defaultMessage: 'Manage data',
          }),
          onClick: () =>
            application.navigateToApp('management', {
              path: '/data/index_management/indices',
            }),
          testSubj: 'homePageDataCardDataManagement',
          telemetryId: getTelemetryId('dataCard-dataManagement'),
        },
      ]
    : [],
});

const getDashboardsCard = ({
  application,
  stats,
  isLoading,
  getTelemetryId,
}: StatCardDeps): HomePageStats => ({
  iconType: 'productDashboard',
  title: i18n.translate('xpack.elasticsearchHome.home.dashboardsCard.title', {
    defaultMessage: 'Dashboards',
  }),
  testSubj: 'homePageDashboardsCard',
  actionsMenuTelemetryId: getTelemetryId('dashboardsCard-actionsMenu'),
  metrics: [
    {
      key: 'dashboardsTotal',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.dashboardsTotalLabel', {
        defaultMessage: 'Total',
      }),
      value: formatNumber(stats.dashboardsCount),
      isLoading,
    },
    {
      key: 'dashboardsStarred',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.dashboardsStarredLabel', {
        defaultMessage: 'Starred',
      }),
      value: formatNumber(stats.starredDashboardsCount),
      isLoading,
    },
  ],
  actions: [
    {
      key: 'createDashboard',
      iconType: 'plusCircle',
      label: i18n.translate('xpack.elasticsearchHome.home.dashboardsCard.createDashboard', {
        defaultMessage: 'Create a dashboard',
      }),
      onClick: () => application.navigateToApp('dashboards', { path: '#/create' }),
      testSubj: 'homePageDashboardsCardCreateDashboard',
      telemetryId: getTelemetryId('dashboardsCard-createDashboard'),
    },
    {
      key: 'manageDashboards',
      iconType: 'gear',
      label: i18n.translate('xpack.elasticsearchHome.home.dashboardsCard.manageDashboards', {
        defaultMessage: 'Manage dashboards',
      }),
      onClick: () => application.navigateToApp('dashboards', { path: '#/list' }),
      testSubj: 'homePageDashboardsCardManageDashboards',
      telemetryId: getTelemetryId('dashboardsCard-manageDashboards'),
    },
  ],
});

const getWorkflowsCard = ({
  application,
  stats,
  isLoading,
  getTelemetryId,
}: StatCardDeps): HomePageStats => ({
  iconType: 'workflow',
  title: i18n.translate('xpack.elasticsearchHome.home.workflowsCard.title', {
    defaultMessage: 'Workflows',
  }),
  testSubj: 'homePageWorkflowsCard',
  actionsMenuTelemetryId: getTelemetryId('workflowsCard-actionsMenu'),
  metrics: [
    {
      key: 'workflowsTotal',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.workflowsTotalLabel', {
        defaultMessage: 'Total',
      }),
      value: formatNumber(stats.workflowsCount),
      isLoading,
    },
    {
      key: 'workflowsRunning',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.workflowsRunningLabel', {
        defaultMessage: 'Running',
      }),
      value: formatNumber(stats.workflowsRunningCount),
      isLoading,
    },
  ],
  actions: [
    {
      key: 'createWorkflow',
      iconType: 'plusCircle',
      label: i18n.translate('xpack.elasticsearchHome.home.workflowsCard.createWorkflow', {
        defaultMessage: 'Create a workflow',
      }),
      onClick: () => application.navigateToApp('workflows', { path: '/create' }),
      testSubj: 'homePageWorkflowsCardCreateWorkflow',
      telemetryId: getTelemetryId('workflowsCard-createWorkflow'),
    },
    {
      key: 'manageWorkflows',
      iconType: 'gear',
      label: i18n.translate('xpack.elasticsearchHome.home.workflowsCard.manageWorkflows', {
        defaultMessage: 'Manage workflows',
      }),
      onClick: () => application.navigateToApp('workflows'),
      testSubj: 'homePageWorkflowsCardManageWorkflows',
      telemetryId: getTelemetryId('workflowsCard-manageWorkflows'),
    },
  ],
});

const getApiKeysCard = ({
  application,
  stats,
  isLoading,
  getTelemetryId,
}: StatCardDeps): HomePageStats => ({
  iconType: 'key',
  title: i18n.translate('xpack.elasticsearchHome.home.apiKeysCard.title', {
    defaultMessage: 'API Keys',
  }),
  testSubj: 'homePageApiKeysCard',
  actionsMenuTelemetryId: getTelemetryId('apiKeysCard-actionsMenu'),
  metrics: [
    {
      key: 'apiKeysTotal',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.apiKeysTotalLabel', {
        defaultMessage: 'Total',
      }),
      value: formatNumber(stats.apiKeysCount),
      isLoading,
    },
    {
      key: 'apiKeysExpiring',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.apiKeysExpiringLabel', {
        defaultMessage: 'Expiring',
      }),
      value: formatNumber(stats.expiringApiKeysCount),
      isLoading,
    },
  ],
  actions: [
    {
      key: 'createApiKey',
      iconType: 'plusCircle',
      label: i18n.translate('xpack.elasticsearchHome.home.apiKeysCard.createApiKey', {
        defaultMessage: 'Create an API key',
      }),
      onClick: () =>
        application.navigateToApp('management', {
          path: '/security/api_keys/create',
        }),
      testSubj: 'homePageApiKeysCardCreateApiKey',
      telemetryId: getTelemetryId('apiKeysCard-createApiKey'),
    },
    {
      key: 'manageApiKeys',
      iconType: 'gear',
      label: i18n.translate('xpack.elasticsearchHome.home.apiKeysCard.manageApiKeys', {
        defaultMessage: 'Manage API keys',
      }),
      onClick: () => application.navigateToApp('management', { path: '/security/api_keys' }),
      testSubj: 'homePageApiKeysCardManageApiKeys',
      telemetryId: getTelemetryId('apiKeysCard-manageApiKeys'),
    },
  ],
});

/** Builds the cards rendered in a row under the data card, in display order. */
export const getSecondaryCards = (deps: StatCardDeps): HomePageStats[] => [
  getDashboardsCard(deps),
  getWorkflowsCard(deps),
  getApiKeysCard(deps),
];
