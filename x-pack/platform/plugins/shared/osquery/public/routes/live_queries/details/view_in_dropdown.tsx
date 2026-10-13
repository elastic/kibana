/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ViewResultsInDiscoverAction } from '../../../discover/view_results_in_discover';
import { ViewResultsInLensAction } from '../../../lens/view_results_in_lens';
import { ViewResultsActionButtonType } from '../../../live_queries/form/pack_queries_status_table';
import type { DateWindowResult } from '../../../common/pack_view_date_window';
import { useKibana } from '../../../common/lib/kibana';

const VIEW_IN_ARIA_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.viewInAriaLabel', {
  defaultMessage: 'View results in',
});

interface ViewInDropdownProps {
  actionId: string;
  startDate?: string;
  endDate?: string;
  mode?: DateWindowResult['mode'];
  scheduleId?: string;
  executionCount?: number;
}

const ViewInDropdownComponent: React.FC<ViewInDropdownProps> = ({
  actionId,
  startDate,
  endDate,
  mode,
  scheduleId,
  executionCount,
}) => {
  const { application, lens } = useKibana().services;
  const canDiscover = !!application.capabilities.discover_v2?.show;
  const canLens = !!lens?.canUseEditor();
  const [isOpen, setIsOpen] = useState(false);
  const handleToggle = useCallback(() => setIsOpen((open) => !open), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const items = useMemo(() => {
    const menuItems = [];

    if (canDiscover) {
      menuItems.push(
        <ViewResultsInDiscoverAction
          key="discover"
          actionId={actionId}
          buttonType={ViewResultsActionButtonType.menuItem}
          startDate={startDate}
          endDate={endDate}
          mode={mode}
          scheduleId={scheduleId}
          executionCount={executionCount}
          onMenuItemClick={handleClose}
        />
      );
    }

    if (canLens) {
      menuItems.push(
        <ViewResultsInLensAction
          key="lens"
          actionId={actionId}
          buttonType={ViewResultsActionButtonType.menuItem}
          startDate={startDate}
          endDate={endDate}
          mode={mode}
          scheduleId={scheduleId}
          executionCount={executionCount}
          onMenuItemClick={handleClose}
        />
      );
    }

    return menuItems;
  }, [
    actionId,
    canDiscover,
    canLens,
    startDate,
    endDate,
    mode,
    scheduleId,
    executionCount,
    handleClose,
  ]);

  if (!canDiscover && !canLens) {
    return null;
  }

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={handleToggle}
          data-test-subj="query-details-view-in"
        >
          <FormattedMessage id="xpack.osquery.queryDetailsHeader.viewIn" defaultMessage="View in" />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={handleClose}
      panelPaddingSize="none"
      aria-label={VIEW_IN_ARIA_LABEL}
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

ViewInDropdownComponent.displayName = 'ViewInDropdown';

export const ViewInDropdown = React.memo(ViewInDropdownComponent);
