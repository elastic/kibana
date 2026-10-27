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
import type { HomePageStatPanelMetric, HomePageStatPanelProps } from './home_page_stat_panel';

interface StatCardDeps {
  application: ApplicationStart;
  chrome: ChromeStart;
  stats: DeploymentStats;
  /** Namespaces a telemetry id under the hosting plugin's prefix. */
  getTelemetryId: (suffix: string) => string;
  dataCardTooltip?: string;
}

type HomePageStats = Omit<HomePageStatPanelProps, 'newIndex'>;

const INDEX_MANAGEMENT_NAV_LINK_ID = 'management:index_management';
const DASHBOARDS_NAV_LINK_ID = 'dashboards';
const WORKFLOWS_NAV_LINK_ID = 'workflows';
const API_KEYS_NAV_LINK_ID = 'management:api_keys';
const WORKFLOWS_FEATURE_ID = 'workflowsManagement';
const READ_WORKFLOW_CAPABILITY = 'readWorkflow';
const CREATE_WORKFLOW_CAPABILITY = 'createWorkflow';
const DASHBOARD_FEATURE_ID = 'dashboard_v2';
const CREATE_DASHBOARD_CAPABILITY = 'createNew';
const API_KEYS_FEATURE_ID = 'api_keys';
const SAVE_API_KEY_CAPABILITY = 'save';

/** A single stat says too little about the deployment to be worth a card of its own. */
const MIN_DATA_CARD_METRICS = 2;

const hasCapability = (
  { application }: Pick<StatCardDeps, 'application'>,
  featureId: string,
  capability: string
): boolean => application.capabilities[featureId]?.[capability] === true;

const showVectorCount = ({ application }: Pick<StatCardDeps, 'application'>): boolean =>
  VECTOR_COUNT_ENABLED &&
  hasCapability({ application }, PLUGIN_ID, CAN_MONITOR_ALL_INDICES_CAPABILITY);

const showIndexManagement = ({ chrome }: Pick<StatCardDeps, 'chrome'>): boolean =>
  chrome.navLinks.has(INDEX_MANAGEMENT_NAV_LINK_ID);

const canReachDashboards = ({ chrome }: Pick<StatCardDeps, 'chrome'>): boolean =>
  chrome.navLinks.has(DASHBOARDS_NAV_LINK_ID);

// The workflows app stays registered for unauthorized users, so its nav link alone is not enough.
const canReachWorkflows = ({
  application,
  chrome,
}: Pick<StatCardDeps, 'application' | 'chrome'>): boolean =>
  chrome.navLinks.has(WORKFLOWS_NAV_LINK_ID) &&
  hasCapability({ application }, WORKFLOWS_FEATURE_ID, READ_WORKFLOW_CAPABILITY);

const canReachApiKeys = ({ chrome }: Pick<StatCardDeps, 'chrome'>): boolean =>
  chrome.navLinks.has(API_KEYS_NAV_LINK_ID);

const buildDataCard = ({
  application,
  chrome,
  stats,
  getTelemetryId,
  dataCardTooltip,
}: StatCardDeps): HomePageStats => ({
  iconType: 'database',
  title: i18n.translate('xpack.elasticsearchHome.home.dataCard.title', {
    defaultMessage: 'Data',
  }),
  titleTooltip: dataCardTooltip,
  testSubj: 'homePageDataCard',
  showPrimary: true,
  metrics: [
    {
      key: 'totalIndices',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.totalIndicesLabel', {
        defaultMessage: 'Total indices',
      }),
      value: formatNumber(stats.indicesCount),
    },
    ...(stats.dataPanelAccess.showDocuments
      ? [
          {
            key: 'documents',
            label: i18n.translate('xpack.elasticsearchHome.home.stats.documentsLabel', {
              defaultMessage: 'Documents',
            }),
            value: formatNumber(stats.documentsCount),
          },
        ]
      : []),
    ...(showVectorCount({ application })
      ? [
          {
            key: 'vectors',
            label: i18n.translate('xpack.elasticsearchHome.home.stats.vectorsLabel', {
              defaultMessage: 'Vectors',
            }),
            value: formatNumber(stats.vectorCount),
          },
        ]
      : []),
    ...(stats.dataPanelAccess.showTotalSize
      ? [
          {
            key: 'totalSize',
            label: i18n.translate('xpack.elasticsearchHome.home.stats.totalSizeLabel', {
              defaultMessage: 'Total size',
            }),
            value: formatBytes(stats.storeSizeBytes),
          },
        ]
      : []),
  ] satisfies HomePageStatPanelMetric[],
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

/** Builds the data card, or `null` when the user's privileges leave it fewer than two stats. */
export const getDataCard = (deps: StatCardDeps): HomePageStats | null => {
  if (!deps.stats.dataPanelAccess.showPanel) {
    return null;
  }

  const card = buildDataCard(deps);
  return card.metrics.length < MIN_DATA_CARD_METRICS ? null : card;
};

const getDashboardsCard = ({
  application,
  stats,
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
    },
    {
      key: 'dashboardsStarred',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.dashboardsStarredLabel', {
        defaultMessage: 'Starred',
      }),
      value: formatNumber(stats.starredDashboardsCount),
    },
  ],
  actions: [
    ...(hasCapability({ application }, DASHBOARD_FEATURE_ID, CREATE_DASHBOARD_CAPABILITY)
      ? [
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
        ]
      : []),
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

const getWorkflowsCard = ({ application, stats, getTelemetryId }: StatCardDeps): HomePageStats => ({
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
    },
    {
      key: 'workflowsRunning',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.workflowsRunningLabel', {
        defaultMessage: 'Running',
      }),
      value: formatNumber(stats.workflowsRunningCount),
    },
  ],
  actions: [
    ...(hasCapability({ application }, WORKFLOWS_FEATURE_ID, CREATE_WORKFLOW_CAPABILITY)
      ? [
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
        ]
      : []),
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

const getApiKeysCard = ({ application, stats, getTelemetryId }: StatCardDeps): HomePageStats => ({
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
    },
    {
      key: 'apiKeysExpiring',
      label: i18n.translate('xpack.elasticsearchHome.home.stats.apiKeysExpiringLabel', {
        defaultMessage: 'Expiring',
      }),
      value: formatNumber(stats.expiringApiKeysCount),
    },
  ],
  actions: [
    ...(hasCapability({ application }, API_KEYS_FEATURE_ID, SAVE_API_KEY_CAPABILITY)
      ? [
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
        ]
      : []),
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

/** Builds the cards rendered in a row under the data card, in display order, skipping any whose app the user cannot reach. */
export const getSecondaryCards = (deps: StatCardDeps): HomePageStats[] => [
  ...(canReachDashboards(deps) ? [getDashboardsCard(deps)] : []),
  ...(canReachWorkflows(deps) ? [getWorkflowsCard(deps)] : []),
  ...(canReachApiKeys(deps) ? [getApiKeysCard(deps)] : []),
];
