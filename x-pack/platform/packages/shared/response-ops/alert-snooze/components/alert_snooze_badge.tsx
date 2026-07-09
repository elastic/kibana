/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface AlertSnoozeBadgeProps {
  /** Human-readable summary of the alert's snooze/mute state, shown in the tooltip. */
  summary: string;
  'data-test-subj'?: string;
}

/**
 * A "bell slash" badge indicating an alert is snoozed or muted, with a tooltip
 * explaining until when / under which conditions. Shared between the alerts
 * table status cell and the alert details page header so both stay in sync.
 */
export const AlertSnoozeBadge = ({
  summary,
  'data-test-subj': dataTestSubj = 'alertSnoozedBadge',
}: AlertSnoozeBadgeProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={summary}>
      <EuiBadge
        data-test-subj={dataTestSubj}
        iconType="bellSlash"
        tabIndex={0}
        css={css`
          padding-inline: ${euiTheme.size.xs};
        `}
      />
    </EuiToolTip>
  );
};
