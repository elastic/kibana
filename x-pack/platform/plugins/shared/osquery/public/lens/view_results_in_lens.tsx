/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import type { DateWindowResult } from '../common/pack_view_date_window';
import { useLensResultsNavigation } from './use_lens_results_navigation';

export { getLensAttributes } from './use_lens_results_navigation';

interface ViewResultsInLensActionProps {
  actionId?: string;
  buttonType: ViewResultsActionButtonType;
  endDate?: string;
  startDate?: string;
  mode?: DateWindowResult['mode'];
  scheduleId?: string;
  executionCount?: number;
}

const ViewResultsInLensActionComponent: React.FC<ViewResultsInLensActionProps> = ({
  actionId,
  buttonType,
  endDate,
  startDate,
  mode,
  scheduleId,
  executionCount,
}) => {
  const { canLens, isDisabled, navigate } = useLensResultsNavigation({
    actionId,
    endDate,
    startDate,
    mode,
    scheduleId,
    executionCount,
  });

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      navigate();
    },
    [navigate]
  );

  if (!canLens) {
    return null;
  }

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty size="xs" iconType="lensApp" onClick={handleClick} isDisabled={isDisabled}>
        {VIEW_IN_LENS}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_LENS} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="lensApp"
        disabled={false}
        onClick={handleClick}
        aria-label={VIEW_IN_LENS}
        isDisabled={isDisabled}
      />
    </EuiToolTip>
  );
};

const VIEW_IN_LENS = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewLensResultsActionAriaLabel',
  {
    defaultMessage: 'View in Lens',
  }
);

export const ViewResultsInLensAction = React.memo(ViewResultsInLensActionComponent);
