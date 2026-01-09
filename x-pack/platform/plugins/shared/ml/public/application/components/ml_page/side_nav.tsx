/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiSideNavItemType } from '@elastic/eui';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { CHANGE_POINT_DETECTION_ENABLED } from '@kbn/aiops-change-point-detection/constants';
import { useUrlState } from '@kbn/ml-url-state';
import type { MlLocatorParams } from '../../../../common/types/locator';
import { useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { isFullLicense } from '../../license';
import type { MlRoute } from '../../routing';
import { ML_PAGES } from '../../../../common/constants/locator';
import { useEnabledFeatures } from '../../contexts/ml';
import { usePermissionCheck } from '../../capabilities/check_capabilities';

export interface Tab {
  id: string;
  name: ReactNode;
  disabled?: boolean;
  items?: Tab[];
  testSubj?: string;
  pathId?: MlLocatorParams['page'];
  onClick?: () => Promise<void>;
  /** Indicates if item should be marked as active with nested routes */
  highlightNestedRoutes?: boolean;
  /** List of route IDs related to the side nav entry */
  relatedRouteIds?: string[];
}

export function useSideNavItems(activeRoute: MlRoute | undefined) {
  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const mlFeaturesDisabled = !isFullLicense();
  const { isADEnabled, isDFAEnabled } = useEnabledFeatures();
  const [canUseAiops] = usePermissionCheck(['canUseAiops']);

  const [globalState] = useUrlState('_g');

  const pageState = useMemo(() => {
    return globalState?.refreshInterval !== undefined
      ? {
          globalState: {
            refreshInterval: globalState.refreshInterval,
          },
        }
      : undefined;
  }, [globalState?.refreshInterval]);

  const redirectToTab = useCallback(
    async (defaultPathId: MlLocatorParams['page']) => {
      const path = await mlLocator!.getUrl({
        page: defaultPathId,
        // only retain the refreshInterval part of globalState
        // appState will not be considered.
        pageState,
      });

      await navigateToPath(path, false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageState]
  );

  const tabsDefinition: Tab[] = useMemo((): Tab[] => {
    const disableLinks = mlFeaturesDisabled;

    const mlTabs: Tab[] = [
      {
        id: 'main_section',
        name: '',
        items: [
          {
            id: 'overview',
            pathId: ML_PAGES.OVERVIEW,
            name: i18n.translate('xpack.ml.navMenu.overviewTabLinkText', {
              defaultMessage: 'Overview',
            }),
            disabled: disableLinks,
            testSubj: 'mlMainTab overview',
          },
          {
            id: 'datavisualizer',
            name: i18n.translate('xpack.ml.navMenu.dataVisualizerTabLinkText', {
              defaultMessage: 'Data visualizer',
            }),
            disabled: false,
            pathId: ML_PAGES.DATA_VISUALIZER,
            testSubj: 'mlMainTab dataVisualizer',
          },
        ],
      },
      ...(isADEnabled
        ? [
            {
              id: 'anomaly_detection_section',
              name: i18n.translate('xpack.ml.navMenu.anomalyDetectionTabLinkText', {
                defaultMessage: 'Anomaly Detection',
              }),
              disabled: disableLinks || !isADEnabled,
              items: [
                {
                  id: 'anomaly_explorer',
                  name: i18n.translate('xpack.ml.navMenu.anomalyDetection.anomalyExplorerText', {
                    defaultMessage: 'Anomaly explorer',
                  }),
                  disabled: disableLinks || !isADEnabled,
                  pathId: ML_PAGES.ANOMALY_EXPLORER,
                  testSubj: 'mlMainTab anomalyExplorer',
                },
                {
                  id: 'single_metric_viewer',
                  name: i18n.translate('xpack.ml.navMenu.anomalyDetection.singleMetricViewerText', {
                    defaultMessage: 'Single metric viewer',
                  }),
                  pathId: ML_PAGES.SINGLE_METRIC_VIEWER,
                  disabled: disableLinks || !isADEnabled,
                  testSubj: 'mlMainTab singleMetricViewer',
                },
              ],
            },
          ]
        : []),
      ...(isDFAEnabled
        ? [
            {
              id: 'data_frame_analytics_section',
              name: i18n.translate('xpack.ml.navMenu.dataFrameAnalyticsTabLinkText', {
                defaultMessage: 'Data frame analytics',
              }),
              disabled: disableLinks || !isDFAEnabled,
              items: [
                {
                  id: 'data_frame_analytics_results_explorer',
                  pathId: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
                  name: i18n.translate('xpack.ml.navMenu.dataFrameAnalytics.resultsExplorerText', {
                    defaultMessage: 'Results explorer',
                  }),
                  disabled: disableLinks || !isDFAEnabled,
                  testSubj: 'mlMainTab dataFrameAnalyticsResultsExplorer',
                },
                {
                  id: 'data_frame_analytics_job_map',
                  pathId: ML_PAGES.DATA_FRAME_ANALYTICS_MAP,
                  name: i18n.translate('xpack.ml.navMenu.dataFrameAnalytics.analyticsMapText', {
                    defaultMessage: 'Analytics map',
                  }),
                  disabled: disableLinks || !isDFAEnabled,
                  testSubj: 'mlMainTab dataFrameAnalyticsMap',
                },
              ],
            },
          ]
        : []),
    ];

    if (canUseAiops === false) {
      return mlTabs;
    }

    mlTabs.push({
      id: 'aiops_section',
      name: i18n.translate('xpack.ml.navMenu.aiopsTabLinkText', {
        defaultMessage: 'AIOps Labs',
      }),
      disabled: disableLinks,
      items: [
        {
          id: 'logRateAnalysis',
          pathId: ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT,
          name: i18n.translate('xpack.ml.navMenu.logRateAnalysisLinkText', {
            defaultMessage: 'Log rate analysis',
          }),
          disabled: disableLinks,
          testSubj: 'mlMainTab logRateAnalysis',
          relatedRouteIds: ['log_rate_analysis'],
        },
        {
          id: 'logCategorization',
          pathId: ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT,
          name: i18n.translate('xpack.ml.navMenu.logCategorizationLinkText', {
            defaultMessage: 'Log pattern analysis',
          }),
          disabled: disableLinks,
          testSubj: 'mlMainTab logCategorization',
          relatedRouteIds: ['log_categorization'],
        },
        ...(CHANGE_POINT_DETECTION_ENABLED
          ? [
              {
                id: 'changePointDetection',
                pathId: ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT,
                name: i18n.translate('xpack.ml.navMenu.changePointDetectionLinkText', {
                  defaultMessage: 'Change point detection',
                }),
                disabled: disableLinks,
                testSubj: 'mlMainTab changePointDetection',
                relatedRouteIds: ['change_point_detection'],
              },
            ]
          : []),
      ],
    });

    return mlTabs;
  }, [mlFeaturesDisabled, isADEnabled, isDFAEnabled, canUseAiops]);

  const getTabItem: (tab: Tab) => EuiSideNavItemType<unknown> = useCallback(
    (tab: Tab) => {
      const {
        id,
        disabled,
        items,
        onClick,
        pathId,
        name,
        testSubj,
        highlightNestedRoutes,
        relatedRouteIds,
      } = tab;

      const onClickCallback = onClick ?? (pathId ? redirectToTab.bind(null, pathId) : undefined);

      const isSelected =
        `/${pathId}` === activeRoute?.path ||
        (!!highlightNestedRoutes && activeRoute?.path.includes(`${pathId}/`)) ||
        (Array.isArray(relatedRouteIds) && relatedRouteIds.includes(activeRoute?.id!));
      return {
        id,
        name,
        isSelected,
        disabled,
        ...(onClickCallback ? { onClick: onClickCallback } : {}),
        'data-test-subj': testSubj + (isSelected ? ' selected' : ''),
        items: items ? items.map(getTabItem) : undefined,
        forceOpen: true,
      };
    },
    [activeRoute, redirectToTab]
  );

  return useMemo(() => tabsDefinition.map(getTabItem), [tabsDefinition, getTabItem]);
}
