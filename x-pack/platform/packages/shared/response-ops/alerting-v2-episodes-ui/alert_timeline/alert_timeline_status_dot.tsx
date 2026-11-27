/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { alertTimelineStatusColor } from './alert_timeline_status_palette';

export interface AlertTimelineStatusDotProps {
  status: AlertEpisodeStatus;
  /** CSS length for the dot diameter; defaults to `euiTheme.size.s`. */
  size?: string;
  'data-test-subj'?: string;
}

/** Decorative Lifecycle-colored dot for an episode status. */
export const AlertTimelineStatusDot = ({
  status,
  size,
  'data-test-subj': dataTestSubj,
}: AlertTimelineStatusDotProps) => {
  const { euiTheme } = useEuiTheme();
  const diameter = size ?? euiTheme.size.s;

  return (
    <span
      aria-hidden
      data-test-subj={dataTestSubj}
      css={{
        display: 'inline-block',
        flexShrink: 0,
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        backgroundColor: alertTimelineStatusColor(euiTheme, status),
      }}
    />
  );
};
