/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, useEuiTheme } from '@elastic/eui';
import {
  getEpisodeSeverityColor,
  getEpisodeSeverityLabel,
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
} from './severity_utils';

export interface AlertEpisodeSeverityHealthProps {
  severity: string | undefined | null;
  /** Hides the label so only the dot renders. */
  hideLabel?: boolean;
  'data-test-subj'?: string;
}

/**
 * Renders a severity as a colored dot followed by its label. Use where a badge
 * would be too heavy, such as inside the details flyout header info blocks.
 * The dot reuses the badge fill color so it matches the table's severity badges.
 */
export const AlertEpisodeSeverityHealth = ({
  severity,
  hideLabel = false,
  'data-test-subj': dataTestSubj,
}: AlertEpisodeSeverityHealthProps) => {
  const { euiTheme } = useEuiTheme();

  if (!isSupportedEpisodeSeverity(severity)) {
    return null;
  }

  const normalized = normalizeEpisodeSeverity(severity);
  const label = getEpisodeSeverityLabel(normalized);

  return (
    <EuiHealth
      color={getEpisodeSeverityColor(euiTheme, normalized)}
      textSize="inherit"
      aria-label={hideLabel ? label : undefined}
      data-test-subj={dataTestSubj ?? `alertingV2EpisodeSeverityHealth-${normalized}`}
    >
      {hideLabel ? null : label}
    </EuiHealth>
  );
};
