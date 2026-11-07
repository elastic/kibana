/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { PAUSED_TOOLTIP } from '../../common/translations';

interface Props {
  pausedAt?: string | null;
  pauseReason?: string | null;
  children: React.ReactElement;
}

/**
 * Adds the pause reason and how long the case has waited to a status badge, so the list and the
 * header say why a case is parked without a column of their own.
 */
export const PausedStatusTooltip: React.FC<Props> = ({ pausedAt, pauseReason, children }) => {
  if (pausedAt == null) {
    return children;
  }

  return (
    <EuiToolTip
      position="top"
      content={
        <>
          {PAUSED_TOOLTIP(pauseReason ?? '')}{' '}
          <FormattedRelativePreferenceDate value={pausedAt} stripMs />
        </>
      }
      data-test-subj="case-status-paused-tooltip"
    >
      {children}
    </EuiToolTip>
  );
};

PausedStatusTooltip.displayName = 'PausedStatusTooltip';
