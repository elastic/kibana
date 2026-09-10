/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ViewResultsInDiscoverAction } from '../../../discover/view_results_in_discover';
import { ViewResultsInLensAction } from '../../../lens/view_results_in_lens';
import { ViewResultsActionButtonType } from '../../../live_queries/form/pack_queries_status_table';

interface ViewInDropdownProps {
  actionId: string;
  startDate?: string;
  endDate?: string;
  scheduleId?: string;
  executionCount?: number;
}

const ViewInDropdownComponent: React.FC<ViewInDropdownProps> = ({
  actionId,
  startDate,
  endDate,
  scheduleId,
  executionCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleToggle = useCallback(() => setIsOpen((open) => !open), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const trigger = (
    <EuiButtonEmpty
      iconType="chevronSingleDown"
      iconSide="right"
      onClick={handleToggle}
      data-test-subj="query-details-view-in"
    >
      <FormattedMessage id="xpack.osquery.queryDetailsHeader.viewIn" defaultMessage="View in" />
    </EuiButtonEmpty>
  );

  const items = useMemo(
    () => [
      <ViewResultsInDiscoverAction
        key="discover"
        actionId={actionId}
        buttonType={ViewResultsActionButtonType.menuItem}
        startDate={startDate}
        endDate={endDate}
        scheduleId={scheduleId}
        executionCount={executionCount}
        onMenuItemClick={handleClose}
      />,
      <ViewResultsInLensAction
        key="lens"
        actionId={actionId}
        buttonType={ViewResultsActionButtonType.menuItem}
        startDate={startDate}
        endDate={endDate}
        scheduleId={scheduleId}
        executionCount={executionCount}
        onMenuItemClick={handleClose}
      />,
    ],
    [actionId, startDate, endDate, scheduleId, executionCount, handleClose]
  );

  return (
    <EuiPopover
      button={trigger}
      isOpen={isOpen}
      closePopover={handleClose}
      panelPaddingSize="none"
      aria-label="View results in"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

ViewInDropdownComponent.displayName = 'ViewInDropdown';

export const ViewInDropdown = React.memo(ViewInDropdownComponent);
