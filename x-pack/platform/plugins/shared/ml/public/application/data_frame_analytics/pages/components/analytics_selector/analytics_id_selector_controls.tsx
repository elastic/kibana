/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  FlyoutType,
  useJobInfoFlyouts,
} from '../../../../jobs/components/job_details_flyout/job_details_flyout_context';
interface Props {
  setIsIdSelectorFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedId?: string;
}

interface SelectorControlProps {
  analyticsId: string;
  'data-test-subj': string;
}

const SelectorControl = ({ analyticsId, 'data-test-subj': dataTestSubj }: SelectorControlProps) => {
  const { setActiveJobId, setActiveFlyout } = useJobInfoFlyouts();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const panels = useMemo(() => {
    return [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('xpack.ml.overview.dataFrameAnalytics.jobContextMenu.details', {
              defaultMessage: 'Job details',
            }),
            icon: 'eye',
            onClick: () => {
              setActiveJobId(analyticsId);
              setActiveFlyout(FlyoutType.DATA_FRAME_ANALYTICS_DETAILS);
              closePopover();
            },
          },
        ],
      },
    ] as EuiContextMenuPanelDescriptor[];
  }, [analyticsId, closePopover, setActiveFlyout, setActiveJobId]);

  const button = (
    <EuiButton
      data-test-subj={dataTestSubj}
      iconType="boxesVertical"
      iconSide="right"
      onClick={setIsPopoverOpen.bind(null, true)}
      size="s"
      color="text"
    >
      {analyticsId}
    </EuiButton>
  );
  return (
    <EuiPopover
      id={`mlAnalyticsDetailsPopover ${analyticsId}`}
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

export const AnalyticsIdSelectorControls: FC<Props> = ({
  setIsIdSelectorFlyoutVisible,
  selectedId,
}) => {
  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          {selectedId ? (
            <SelectorControl
              key={`${selectedId}-id`}
              data-test-subj={`mlAnalyticsIdSelectionBadge ${selectedId}`}
              analyticsId={selectedId}
            />
          ) : null}
          {!selectedId ? (
            <EuiText size={'xs'}>
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.noIdsSelectedLabel"
                defaultMessage="No Analytics ID selected"
              />
            </EuiText>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="pencil"
            onClick={setIsIdSelectorFlyoutVisible.bind(null, true)}
            data-test-subj="mlButtonEditAnalyticsIdSelection"
          >
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.editSelection"
              defaultMessage="Edit selection"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
    </>
  );
};
