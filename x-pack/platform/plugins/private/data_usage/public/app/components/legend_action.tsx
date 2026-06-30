/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { DatasetQualityLink } from './dataset_quality_link';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { LegendActionItem } from './legend_action_item';
import { UX_LABELS } from '../../translations';

interface LegendActionProps {
  idx: number;
  popoverOpen: string | null;
  togglePopover: (streamName: string | null) => void;
  label: string;
}

export const LegendAction: React.FC<LegendActionProps> = React.memo(
  ({ label, idx, popoverOpen, togglePopover }) => {
    const uniqueStreamName = `${idx}-${label}`;
    const {
      services: {
        share: {
          url: { locators },
        },
        application: { capabilities },
      },
    } = useKibanaContextForPlugin();
    const hasDataSetQualityFeature = !!capabilities?.data_quality;
    const hasIndexManagementFeature = !!capabilities?.index_management;

    const onClickIndexManagement = useCallback(async () => {
      const locator = locators.get<IndexManagementLocatorParams>('INDEX_MANAGEMENT_LOCATOR_ID');
      if (locator) {
        await locator.navigate({
          page: 'data_streams_details',
          dataStreamName: label,
        });
      }
      togglePopover(null); // Close the popover after action
    }, [label, locators, togglePopover]);

    const onCopyDataStreamName = useCallback(() => {
      navigator.clipboard.writeText(label);
      togglePopover(null); // Close popover after copying
    }, [label, togglePopover]);

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiPopover
          aria-label={i18n.translate('xpack.dataUsage.legendAction.popoverAriaLabel', {
            defaultMessage: 'Data stream actions',
          })}
          data-test-subj="legendActionPopover"
          button={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiToolTip content={UX_LABELS.dataQualityPopup.open} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="boxesVertical"
                    aria-label={UX_LABELS.dataQualityPopup.open}
                    onClick={() => togglePopover(uniqueStreamName)}
                    data-test-subj="legendActionButton"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          isOpen={popoverOpen === uniqueStreamName}
          closePopover={() => togglePopover(null)}
          anchorPosition="downRight"
        >
          <EuiListGroup gutterSize="none">
            <LegendActionItem
              label={UX_LABELS.dataQualityPopup.copy}
              onClick={onCopyDataStreamName}
              dataTestSubj="copyDataStreamNameAction"
            />
            {hasIndexManagementFeature && (
              <LegendActionItem
                label={UX_LABELS.dataQualityPopup.manage}
                onClick={onClickIndexManagement}
                dataTestSubj="manageDataStreamAction"
              />
            )}
            {hasDataSetQualityFeature && <DatasetQualityLink dataStreamName={label} />}
          </EuiListGroup>
        </EuiPopover>
      </EuiFlexGroup>
    );
  }
);
