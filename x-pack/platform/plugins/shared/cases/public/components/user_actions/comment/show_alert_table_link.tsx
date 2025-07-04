/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';
import { SHOW_ALERT_TABLE_TOOLTIP } from '../translations';

export const ShowAlertTableLink = () => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();

  const handleShowAlertsTable = useCallback(() => {
    navigateToCaseView({ detailName, tabId: CASE_VIEW_PAGE_TABS.ALERTS });
  }, [navigateToCaseView, detailName]);
  return (
    <EuiToolTip position="top" content={<p>{SHOW_ALERT_TABLE_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={SHOW_ALERT_TABLE_TOOLTIP}
        data-test-subj={`comment-action-show-alerts-${detailName}`}
        onClick={handleShowAlertsTable}
        iconType="inspect"
        id={`${detailName}-show-alerts`}
      />
    </EuiToolTip>
  );
};

ShowAlertTableLink.displayName = 'ShowAlertTableLink';
