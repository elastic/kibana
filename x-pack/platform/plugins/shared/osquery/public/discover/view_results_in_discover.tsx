/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DateWindowResult } from '../common/pack_view_date_window';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import { useDiscoverResultsUrl } from './use_discover_results_url';

interface ViewResultsInDiscoverActionProps {
  actionId?: string;
  buttonType: ViewResultsActionButtonType;
  endDate?: string;
  startDate?: string;
  mode?: DateWindowResult['mode'];
  scheduleId?: string;
  executionCount?: number;
}

const ViewResultsInDiscoverActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  buttonType,
  endDate,
  startDate,
  mode,
  scheduleId,
  executionCount,
}) => {
  const { canDiscover, discoverUrl } = useDiscoverResultsUrl({
    actionId,
    endDate,
    startDate,
    mode,
    scheduleId,
    executionCount,
  });

  if (!canDiscover) {
    return null;
  }

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty size="xs" iconType="discoverApp" href={discoverUrl} target="_blank">
        {VIEW_IN_DISCOVER}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_DISCOVER} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="discoverApp"
        aria-label={VIEW_IN_DISCOVER}
        href={discoverUrl}
        target="_blank"
        isDisabled={!actionId || !discoverUrl.length}
      />
    </EuiToolTip>
  );
};

const VIEW_IN_DISCOVER = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewDiscoverResultsActionAriaLabel',
  {
    defaultMessage: 'View in Discover',
  }
);

export const ViewResultsInDiscoverAction = React.memo(ViewResultsInDiscoverActionComponent);
