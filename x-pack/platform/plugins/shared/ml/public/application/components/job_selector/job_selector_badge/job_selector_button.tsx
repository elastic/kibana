/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiButton, EuiContextMenu, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MlPages } from '../../../../../common/constants/locator';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../../../common/constants/locator';
import { useJobInfoFlyouts } from '../../../jobs/components/job_details_flyout';
import { useMlKibana } from '../../../contexts/kibana';
import { FlyoutType } from '../../../jobs/components/job_details_flyout/job_details_flyout_context';

interface Props {
  jobId: string;
  page: MlPages;
  onRemoveJobId: (jobId: string) => void;
  removeJobIdDisabled: boolean;
}

const ANOMALY_EXPLORER_TITLE = i18n.translate('xpack.ml.deepLink.anomalyExplorer', {
  defaultMessage: 'Anomaly explorer',
});
const SINGLE_METRIC_VIEWER_TITLE = i18n.translate('xpack.ml.deepLink.singleMetricViewer', {
  defaultMessage: 'Single metric viewer',
});
export const AnomalyDetectionInfoButton: FC<Props> = ({
  jobId,
  page,
  onRemoveJobId,
  removeJobIdDisabled,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const {
    services: {
      share,
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const popoverId = useGeneratedHtmlId({
    prefix: 'adJobInfoContextMenu',
    suffix: jobId,
  });
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };
  const closePopover = () => {
    setPopover(false);
  };

  const { setActiveFlyout, setActiveJobId } = useJobInfoFlyouts();
  const panels = useMemo(() => {
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
    return [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('xpack.ml.overview.anomalyDetection.jobContextMenu.jobDetails', {
              defaultMessage: 'Job details',
            }),
            icon: 'editorTable',
            onClick: () => {
              setActiveJobId(jobId);
              setActiveFlyout(FlyoutType.JOB_DETAILS);
              closePopover();
            },
          },
          {
            name: i18n.translate('xpack.ml.overview.anomalyDetection.jobContextMenu.removeJob', {
              defaultMessage: 'Remove from {page}',
              values: {
                page:
                  page === ML_PAGES.ANOMALY_EXPLORER
                    ? ANOMALY_EXPLORER_TITLE
                    : SINGLE_METRIC_VIEWER_TITLE,
              },
            }),
            disabled: removeJobIdDisabled,
            icon: 'minusInCircle',
            onClick: () => {
              if (onRemoveJobId) {
                onRemoveJobId(jobId);
              }
              closePopover();
            },
          },
          {
            isSeparator: true,
            key: 'sep',
          } as EuiContextMenuPanelItemDescriptor,
          viewInMenu,
          {
            name: i18n.translate(
              'xpack.ml.overview.anomalyDetection.jobContextMenu.viewDatafeedCounts',
              {
                defaultMessage: 'View datafeed counts',
              }
            ),
            icon: 'visAreaStacked',
            onClick: () => {
              setActiveJobId(jobId);
              setActiveFlyout(FlyoutType.DATAFEED_CHART);
              closePopover();
            },
          },
        ],
      },
    ] as EuiContextMenuPanelDescriptor[];
  }, [
    jobId,
    page,
    setActiveJobId,
    setActiveFlyout,
    navigateToUrl,
    share.url.locators,
    removeJobIdDisabled,
    onRemoveJobId,
  ]);

  const button = (
    <EuiButton
      iconType="boxesVertical"
      iconSide="right"
      onClick={onButtonClick}
      size="s"
      color="text"
    >
      {jobId}
    </EuiButton>
  );
  return (
    <EuiPopover
      id={popoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
