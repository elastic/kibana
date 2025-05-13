/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ML_PAGES, type MlPages } from '../../../../locator';
import { FlyoutType } from '../../../jobs/components/job_details_flyout/job_details_flyout_context';
import { ML_APP_LOCATOR } from '../../../../../common/constants/locator';

const ANOMALY_EXPLORER_TITLE = i18n.translate('xpack.ml.anomalyExplorerPageLabel', {
  defaultMessage: 'Anomaly Explorer',
});
const SINGLE_METRIC_VIEWER_TITLE = i18n.translate('xpack.ml.singleMetricViewerPageLabel', {
  defaultMessage: 'Single Metric Viewer',
});

export const getOptionsForJobSelectorMenuItems = ({
  jobId,
  page,
  onRemoveJobId,
  removeJobIdDisabled,
  showRemoveJobId,
  isSingleMetricViewerDisabled,
  closePopover,
  globalState,
  setActiveFlyout,
  setActiveJobId,
  navigateToUrl,
  share,
}: {
  jobId: string;
  page: MlPages;
  onRemoveJobId: (jobOrGroupId: string[]) => void;
  removeJobIdDisabled: boolean;
  showRemoveJobId: boolean;
  isSingleMetricViewerDisabled: boolean;
  closePopover: () => void;
  globalState: Record<string, any>;
  setActiveFlyout: (flyout: FlyoutType | null) => void;
  setActiveJobId: (jobId: string | null) => void;
  navigateToUrl: (url: string) => void;
  share: SharePluginStart;
}) => {
  const pageToNavigateTo =
    page === ML_PAGES.SINGLE_METRIC_VIEWER ? ANOMALY_EXPLORER_TITLE : SINGLE_METRIC_VIEWER_TITLE;
  const viewInMenu: EuiContextMenuPanelItemDescriptor = {
    name: i18n.translate(
      'xpack.ml.overview.anomalyDetection.jobContextMenu.viewInSingleMetricViewer',
      {
        defaultMessage: 'View in {page}',
        values: {
          page: pageToNavigateTo,
        },
      }
    ),
    disabled: page === ML_PAGES.ANOMALY_EXPLORER && isSingleMetricViewerDisabled,
    icon: 'visLine',
    onClick: async () => {
      const mlLocator = share.url.locators.get(ML_APP_LOCATOR);
      if (!mlLocator) {
        return;
      }
      const singleMetricViewerLink = await mlLocator.getUrl(
        {
          page:
            page === ML_PAGES.SINGLE_METRIC_VIEWER
              ? ML_PAGES.ANOMALY_EXPLORER
              : ML_PAGES.SINGLE_METRIC_VIEWER,
          pageState: {
            globalState,
            refreshInterval: {
              display: 'Off',
              pause: true,
              value: 0,
            },
            jobIds: [jobId],
            query: {
              query_string: {
                analyze_wildcard: true,
                query: '*',
              },
            },
          },
        },
        { absolute: true }
      );
      navigateToUrl(singleMetricViewerLink);

      closePopover();
    },
  };

  const items = [
    {
      name: i18n.translate('xpack.ml.overview.anomalyDetection.jobContextMenu.jobDetails', {
        defaultMessage: 'Job details',
      }),
      icon: 'eye',
      onClick: () => {
        setActiveJobId(jobId);
        setActiveFlyout(FlyoutType.JOB_DETAILS);
        closePopover();
      },
    },
    ...(showRemoveJobId
      ? [
          {
            name: i18n.translate('xpack.ml.overview.anomalyDetection.jobContextMenu.removeJob', {
              defaultMessage: 'Remove from {page}',
              values: {
                page: ANOMALY_EXPLORER_TITLE,
              },
            }),
            disabled: removeJobIdDisabled,
            icon: 'minusInCircle',
            onClick: () => {
              if (onRemoveJobId) {
                onRemoveJobId([jobId]);
                setActiveJobId(jobId);
                setActiveFlyout(null);
              }
              closePopover();
            },
          },
        ]
      : []),
    {
      isSeparator: true,
      key: 'separator2',
    } as EuiContextMenuPanelItemDescriptor,
    ...(viewInMenu.disabled ? [] : [viewInMenu]),
    {
      name: i18n.translate('xpack.ml.overview.anomalyDetection.jobContextMenu.viewDatafeedCounts', {
        defaultMessage: 'View datafeed counts',
      }),
      icon: 'visAreaStacked',
      onClick: () => {
        setActiveJobId(jobId);
        setActiveFlyout(FlyoutType.DATAFEED_CHART);
        closePopover();
      },
    },
  ];
  return items;
};
