/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LinkId } from '@kbn/deeplinks-ml';

import { type AppDeepLink } from '@kbn/core/public';
import type { MlCapabilities } from '../../../common/types/capabilities';
import { ML_PAGES } from '../../../common/constants/locator';

function createDeepLinks(
  mlCapabilities: MlCapabilities,
  isFullLicense: boolean,
  isServerless: boolean,
  esqlEnabled?: boolean
) {
  return {
    getOverviewLinkDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!isFullLicense) return null;

      return {
        id: 'overview',
        title: i18n.translate('xpack.ml.deepLink.overview', {
          defaultMessage: 'Overview',
        }),
        path: `/${ML_PAGES.OVERVIEW}`,
      };
    },

    getAnomalyDetectionDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!isFullLicense || !mlCapabilities.isADEnabled) return null;

      return {
        id: 'anomalyDetection',
        title: i18n.translate('xpack.ml.deepLink.anomalyDetection', {
          defaultMessage: 'Anomaly detection',
        }),
        deepLinks: [
          {
            id: 'anomalyExplorer',
            title: i18n.translate('xpack.ml.deepLink.anomalyExplorer', {
              defaultMessage: 'Anomaly explorer',
            }),
            path: `/${ML_PAGES.ANOMALY_EXPLORER}`,
          },
          {
            id: 'singleMetricViewer',
            title: i18n.translate('xpack.ml.deepLink.singleMetricViewer', {
              defaultMessage: 'Single metric viewer',
            }),
            path: `/${ML_PAGES.SINGLE_METRIC_VIEWER}`,
          },
          {
            id: 'suppliedConfigurations',
            title: i18n.translate('xpack.ml.deepLink.suppliedConfigurations', {
              defaultMessage: 'Supplied configurations',
            }),
            // @deprecated since 9.1, kept here to redirect to new management page location
            // TODO: Change redirect to management page once #213152 is resolved
            path: `/supplied_configurations`,
          },
        ],
      };
    },

    getDataFrameAnalyticsDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!isFullLicense || !mlCapabilities.isDFAEnabled) return null;

      return {
        id: 'dataFrameAnalytics',
        title: i18n.translate('xpack.ml.deepLink.dataFrameAnalytics', {
          defaultMessage: 'Data Frame Analytics',
        }),
        deepLinks: [
          {
            id: 'resultExplorer',
            title: i18n.translate('xpack.ml.deepLink.resultExplorer', {
              defaultMessage: 'Results explorer',
            }),
            path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION}`,
          },
          {
            id: 'analyticsMap',
            title: i18n.translate('xpack.ml.deepLink.analyticsMap', {
              defaultMessage: 'Analytics map',
            }),
            path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_MAP}`,
          },
        ],
      };
    },

    getModelManagementDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!mlCapabilities.isDFAEnabled && !mlCapabilities.isNLPEnabled) return null;

      if (!isServerless) {
        return {
          id: 'nodes',
          title: i18n.translate('xpack.ml.deepLink.nodes', {
            defaultMessage: 'Nodes',
          }),
          // TODO: Change redirect to management page once #213152 is resolved
          path: `/${ML_PAGES.NODES}`,
        };
      }
      return null;
    },

    getMemoryUsageDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!isFullLicense) return null;

      return {
        id: 'memoryUsage',
        title: i18n.translate('xpack.ml.deepLink.memoryUsage', {
          defaultMessage: 'Memory Usage',
        }),
        // TODO: Change redirect to management page once #213152 is resolved
        path: `/${ML_PAGES.MEMORY_USAGE}`,
      };
    },

    getAiopsDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!mlCapabilities.canUseAiops) return null;

      return {
        id: 'aiOps',
        title: i18n.translate('xpack.ml.deepLink.aiOps', {
          defaultMessage: 'AIOps',
        }),
        // Default to the index select page for log rate analysis since we don't have an AIops overview page
        path: `/${ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT}`,
        deepLinks: [
          {
            id: 'logRateAnalysis',
            title: i18n.translate('xpack.ml.deepLink.logRateAnalysis', {
              defaultMessage: 'Log rate analysis',
            }),
            path: `/${ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT}`,
          },
          {
            id: 'logRateAnalysisPage',
            title: i18n.translate('xpack.ml.deepLink.logRateAnalysis', {
              defaultMessage: 'Log rate analysis',
            }),
            path: `/${ML_PAGES.AIOPS_LOG_RATE_ANALYSIS}`,
            visibleIn: [],
          },
          {
            id: 'logPatternAnalysis',
            title: i18n.translate('xpack.ml.deepLink.logPatternAnalysis', {
              defaultMessage: 'Log pattern analysis',
            }),
            path: `/${ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT}`,
          },
          {
            id: 'logPatternAnalysisPage',
            title: i18n.translate('xpack.ml.deepLink.logPatternAnalysis', {
              defaultMessage: 'Log pattern analysis',
            }),
            path: `/${ML_PAGES.AIOPS_LOG_CATEGORIZATION}`,
            visibleIn: [],
          },
          {
            id: 'changePointDetections',
            title: i18n.translate('xpack.ml.deepLink.changePointDetection', {
              defaultMessage: 'Change point detection',
            }),
            path: `/${ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT}`,
          },
          {
            id: 'changePointDetectionsPage',
            title: i18n.translate('xpack.ml.deepLink.changePointDetection', {
              defaultMessage: 'Change point detection',
            }),
            path: `/${ML_PAGES.AIOPS_CHANGE_POINT_DETECTION}`,
            visibleIn: [],
          },
        ],
      };
    },

    getNotificationsDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!isFullLicense) return null;

      return {
        id: 'notifications',
        title: i18n.translate('xpack.ml.deepLink.notifications', {
          defaultMessage: 'Notifications',
        }),
        // TODO: Change redirect to management page once #213152 is resolved
        path: `/${ML_PAGES.NOTIFICATIONS}`,
      };
    },

    getDataVisualizerDeepLink: (): AppDeepLink<LinkId> => {
      return {
        id: 'dataVisualizer',
        title: i18n.translate('xpack.ml.deepLink.dataVisualizer', {
          defaultMessage: 'Data visualizer',
        }),
        path: `/${ML_PAGES.DATA_VISUALIZER}`,
      };
    },

    getFileUploadDeepLink: (): AppDeepLink<LinkId> => {
      return {
        id: 'fileUpload',
        title: i18n.translate('xpack.ml.deepLink.fileUpload', {
          defaultMessage: 'File upload',
        }),
        keywords: ['CSV', 'JSON'],
        path: `/${ML_PAGES.DATA_VISUALIZER_FILE}`,
      };
    },

    getIndexDataVisualizerDeepLink: (): AppDeepLink<LinkId> => {
      return {
        id: 'indexDataVisualizer',
        title: i18n.translate('xpack.ml.deepLink.indexDataVisualizer', {
          defaultMessage: 'Index data visualizer',
        }),
        path: `/${ML_PAGES.DATA_VISUALIZER_INDEX_SELECT}`,
      };
    },
    getIndexDataVisualizerPageDeepLink: (): AppDeepLink<LinkId> => {
      return {
        id: 'indexDataVisualizerPage',
        title: i18n.translate('xpack.ml.deepLink.indexDataVisualizer', {
          defaultMessage: 'Index data visualizer',
        }),
        path: `/${ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER}`,
        visibleIn: [],
      };
    },

    getESQLDataVisualizerDeepLink: (): AppDeepLink<LinkId> | null => {
      if (!esqlEnabled) return null;
      return {
        id: 'esqlDataVisualizer',
        title: i18n.translate('xpack.ml.deepLink.esqlDataVisualizer', {
          defaultMessage: 'ES|QL data visualizer',
        }),
        path: `/${ML_PAGES.DATA_VISUALIZER_ESQL}`,
      };
    },

    getDataDriftDeepLink: (): AppDeepLink<LinkId> => {
      return {
        id: 'dataDrift',
        title: i18n.translate('xpack.ml.deepLink.dataDrift', {
          defaultMessage: 'Data drift',
        }),
        path: `/${ML_PAGES.DATA_DRIFT_INDEX_SELECT}`,
      };
    },
    getDataDriftPageDeepLink: (): AppDeepLink<LinkId> => {
      return {
        id: 'dataDriftPage',
        title: i18n.translate('xpack.ml.deepLink.dataDrift', {
          defaultMessage: 'Data drift',
        }),
        path: `/${ML_PAGES.DATA_DRIFT}`,
        visibleIn: [],
      };
    },
  };
}

export function getDeepLinks(
  isFullLicense: boolean,
  mlCapabilities: MlCapabilities,
  isServerless: boolean,
  esqlEnabled?: boolean
): Array<AppDeepLink<LinkId>> {
  const links = createDeepLinks(mlCapabilities, isFullLicense, isServerless, esqlEnabled);
  return Object.values(links)
    .map((link) => link())
    .filter((link): link is AppDeepLink<LinkId> => link !== null);
}
