/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { upperFirst } from 'lodash';

const SUPPORTED_SEVERITIES = new Set(['info', 'low', 'medium', 'high', 'critical']);

const SEVERITY_COLORS: Record<string, EuiBadgeProps['color']> = {
  critical: 'danger',
  high: 'warning',
  medium: 'success',
  low: 'primary',
  info: 'default',
};

export interface AlertEpisodeSeverityBadgeProps {
  severity: string | undefined | null;
}

export const isSupportedEpisodeSeverity = (
  severity: string | undefined | null
): severity is string => {
  if (severity == null || severity === '') {
    return false;
  }

  return SUPPORTED_SEVERITIES.has(severity.toLowerCase());
};

export const AlertEpisodeSeverityBadge = ({ severity }: AlertEpisodeSeverityBadgeProps) => {
  if (!isSupportedEpisodeSeverity(severity)) {
    return null;
  }

  const normalized = severity.toLowerCase();

  return (
    <EuiBadge
      color={SEVERITY_COLORS[normalized]}
      data-test-subj={`alertingV2EpisodeSeverityBadge-${normalized}`}
    >
      {upperFirst(normalized)}
    </EuiBadge>
  );
};
