/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';
import { SHOW_TABLE_TOOLTIP, SHOW_TABLE_ARIA_LABEL } from './translations';

interface ShowTableLinkProps {
  tabId: typeof CASE_VIEW_PAGE_TABS.ALERTS;
  tooltipText?: string;
}

export const ShowTableButton: React.FC<ShowTableLinkProps> = ({
  tabId,
  tooltipText = SHOW_TABLE_TOOLTIP,
}) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();

  const handleShowTable = useCallback(() => {
    navigateToCaseView({ detailName, tabId });
  }, [navigateToCaseView, detailName, tabId]);
  return (
    <EuiToolTip position="top" content={<p>{tooltipText}</p>}>
      <EuiButtonIcon
        aria-label={SHOW_TABLE_ARIA_LABEL}
        data-test-subj={`comment-action-show-table-${detailName}`}
        onClick={handleShowTable}
        iconType="inspect"
        id={`${detailName}-show-table`}
      />
    </EuiToolTip>
  );
};

ShowTableButton.displayName = 'ShowTableButton';
