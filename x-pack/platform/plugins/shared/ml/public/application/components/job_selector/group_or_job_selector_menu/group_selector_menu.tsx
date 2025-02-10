/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiNotificationBadge, EuiPopover } from '@elastic/eui';

import React, { useMemo, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { useUrlState } from '@kbn/ml-url-state';
import { i18n } from '@kbn/i18n';
import type { MlPages } from '../../../../locator';
import { useJobInfoFlyouts } from '../../../jobs/components/job_details_flyout/job_details_flyout_context';
import { getOptionsForJobSelectorMenuItems } from './get_options_for_job_selector_menu';
import { useMlKibana } from '../../../contexts/kibana';

export const GroupSelectorMenu = ({
  groupId,
  jobIds,
  page,
  onRemoveJobId,
  removeJobIdDisabled,
  removeGroupDisabled,
  singleMetricViewerDisabledIds = [],
}: {
  groupId: string;
  jobIds: string[];
  page: MlPages;
  onRemoveJobId: (jobOrGroupId: string[]) => void;
  removeJobIdDisabled: boolean;
  removeGroupDisabled: boolean;
  singleMetricViewerDisabledIds: string[];
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { setActiveFlyout, setActiveJobId } = useJobInfoFlyouts();
  const {
    services: {
      share,
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const [globalState] = useUrlState('_g');

  const closePopover = () => setIsPopoverOpen(false);
  const onButtonClick = () => setIsPopoverOpen(true);

  const popoverId = `mlAnomalyGroupPopover-${groupId}`;
  const button = (
    <EuiButton
      data-test-subj="mlJobSelectionBadge"
      iconType="folderClosed"
      iconSide="left"
      onClick={onButtonClick}
      size="s"
      color="text"
    >
      {groupId}
      <EuiNotificationBadge size="s">{jobIds.length}</EuiNotificationBadge>
    </EuiButton>
  );
  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const items: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        items: [
          ...jobIds.map((jobId, idx) => ({
            panel: jobId,
            name: jobId,
          })),
          {
            isSeparator: true,
          },
          {
            name: i18n.translate('xpack.ml.groupSelectorMenu.removeGroupLabel', {
              defaultMessage: 'Remove group from {page}',
              values: { page },
            }),
            icon: 'minusInCircle',
            disabled: removeGroupDisabled,
            onClick: () => {
              onRemoveJobId([groupId, ...jobIds]);
              closePopover();
            },
          },
        ],
      },
    ];

    jobIds.forEach((jobId) => {
      const options = getOptionsForJobSelectorMenuItems({
        jobId,
        page,
        onRemoveJobId,
        removeJobIdDisabled,
        showRemoveJobId: false,
        isSingleMetricViewerDisabled: singleMetricViewerDisabledIds.includes(jobId),
        closePopover,
        globalState,
        setActiveFlyout,
        setActiveJobId,
        navigateToUrl,
        share,
      });
      const jobPanel: EuiContextMenuPanelDescriptor = {
        id: jobId,
        title: jobId,
        items: options,
      };
      items.push(jobPanel);
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    jobIds,
    setActiveFlyout,
    setActiveJobId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(globalState),
    navigateToUrl,
    share,
    page,
    onRemoveJobId,
    removeJobIdDisabled,
    removeGroupDisabled,
  ]);
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
