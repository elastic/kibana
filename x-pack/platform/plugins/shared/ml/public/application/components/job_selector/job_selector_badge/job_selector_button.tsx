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
import { ML_PAGES } from '../../../../../common/constants/locator';
import { useJobDetailFlyout } from '../../../jobs/components/job_details_flyout';

interface Props {
  jobId: string;
  page: MlPages;
}

const ANOMALY_EXPLORER_TITLE = i18n.translate('xpack.ml.deepLink.anomalyExplorer', {
  defaultMessage: 'Anomaly explorer',
});
const SINGLE_METRIC_VIEWER_TITLE = i18n.translate('xpack.ml.deepLink.singleMetricViewer', {
  defaultMessage: 'Single metric viewer',
});
export const AnomalyDetectionInfoButton: FC<Props> = ({ jobId, page }) => {
  const [isPopoverOpen, setPopover] = useState(false);
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

  const { setIsFlyoutOpen, setActiveJobId } = useJobDetailFlyout();
  const panels = useMemo(() => {
    const viewInMenu: EuiContextMenuPanelItemDescriptor = {
      name: i18n.translate(
        'xpack.ml.overview.anomalyDetection.jobContextMenu.viewInSingleMetricViewer',
        {
          defaultMessage: 'View in {page}',
          values: {
            page:
              page === ML_PAGES.SINGLE_METRIC_VIEWER
                ? ANOMALY_EXPLORER_TITLE
                : SINGLE_METRIC_VIEWER_TITLE,
          },
        }
      ),
      icon: 'visLine',
      onClick: closePopover,
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
              setIsFlyoutOpen(true);
            },
          },
          {
            name: i18n.translate('xpack.ml.overview.anomalyDetection.jobContextMenu.editJob', {
              defaultMessage: 'Edit job',
            }),
            icon: 'pencil',
            onClick: closePopover,
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
            icon: 'minusInCircle',
            onClick: closePopover,
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
            onClick: closePopover,
          },
        ],
      },
    ] as EuiContextMenuPanelDescriptor[];
  }, [jobId, page, setActiveJobId, setIsFlyoutOpen]);

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
