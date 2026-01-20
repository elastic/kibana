/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useUrlState } from '@kbn/ml-url-state';
import { ML_PAGES, type MlPages } from '../../../../../common/constants/locator';
import { useJobInfoFlyouts } from '../../../jobs/components/job_details_flyout';
import { useMlKibana } from '../../../contexts/kibana';
import { getOptionsForJobSelectorMenuItems } from './get_options_for_job_selector_menu';

interface Props {
  jobId: string;
  page: MlPages;
  onRemoveJobId: (jobOrGroupId: string[]) => void;
  removeJobIdDisabled: boolean;
  isSingleMetricViewerDisabled: boolean;
}

export const AnomalyDetectionInfoButton: FC<Props> = ({
  jobId,
  page,
  onRemoveJobId,
  removeJobIdDisabled,
  isSingleMetricViewerDisabled,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const {
    services: {
      share,
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const [globalState] = useUrlState('_g');

  const popoverId = useGeneratedHtmlId({
    prefix: 'adJobInfoContextMenu',
    suffix: jobId,
  });
  const onButtonClick = () => setPopover((prev) => !prev);
  const closePopover = () => {
    setPopover(false);
  };

  const { setActiveFlyout, setActiveJobId } = useJobInfoFlyouts();
  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => {
      return [
        {
          id: 0,
          items: getOptionsForJobSelectorMenuItems({
            jobId,
            page,
            onRemoveJobId,
            removeJobIdDisabled,
            showRemoveJobId: page === ML_PAGES.ANOMALY_EXPLORER,
            isSingleMetricViewerDisabled,
            closePopover,
            globalState,
            setActiveFlyout,
            setActiveJobId,
            navigateToUrl,
            share,
          }),
        },
      ];
    },
    // globalState is an object with references change on every render, so we are stringifying it here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      jobId,
      page,
      setActiveJobId,
      setActiveFlyout,
      navigateToUrl,
      share.url.locators,
      removeJobIdDisabled,
      onRemoveJobId,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(globalState),
    ]
  );

  const button = (
    <EuiButton data-test-subj="mlJobSelectionBadge" onClick={onButtonClick} size="s" color="text">
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={true}>
          <EuiText textAlign="center" size="s">
            {jobId}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="boxesVertical" />
        </EuiFlexItem>
      </EuiFlexGroup>
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
