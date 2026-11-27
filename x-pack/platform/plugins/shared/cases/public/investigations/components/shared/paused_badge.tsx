/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge } from '@elastic/eui';
import { ICONS } from '../../icons';
import { formatDuration } from './formatters';
import * as i18n from './translations';

const TICK_MS = 1000;

export interface PausedBadgeProps {
  /** When the pause started. */
  pausedAt: string;
  reason?: string | null;
}

/** "Paused: {reason} · {duration}", with the duration of the current pause counting up. */
export const PausedBadge: React.FC<PausedBadgeProps> = ({ pausedAt, reason }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const startedAt = Date.parse(pausedAt);
  const duration = formatDuration(Number.isNaN(startedAt) ? 0 : now - startedAt);

  return (
    <EuiBadge color="warning" iconType={ICONS.pause} data-test-subj="investigationPausedBadge">
      {reason ? i18n.PAUSED_BADGE(reason, duration) : i18n.PAUSED_BADGE_NO_REASON(duration)}
    </EuiBadge>
  );
};
PausedBadge.displayName = 'PausedBadge';
