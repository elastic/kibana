/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge } from '@elastic/eui';
import * as i18n from '../translations';

const MINUTE_MS = 60 * 1000;
const URGENT_THRESHOLD_MS = 5 * MINUTE_MS;

const formatRemaining = (ms: number): string => {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

interface TimeoutChipProps {
  timeoutAt?: string | null;
  /**
   * When true, render the expired-state badge instead of a countdown. Used
   * when `response_mode === 'timed_out'`.
   */
  expired?: boolean;
}

/**
 * Surfaces `timeout_at` as a live-updating countdown chip. Goes danger in the
 * last 5 minutes; renders an "Expired" badge when `expired` is true. Aligns
 * with the HITL GA timeout epic sub-issue [security-team#16708](https://github.com/elastic/security-team/issues/16708).
 */
export const TimeoutChip: React.FC<TimeoutChipProps> = ({ timeoutAt, expired }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timeoutAt || expired) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timeoutAt, expired]);

  if (expired) {
    return <EuiBadge color="danger">{i18n.TIMEOUT_EXPIRED_LABEL}</EuiBadge>;
  }

  if (!timeoutAt) return null;

  const parsed = new Date(timeoutAt).getTime();
  // Defend against malformed `timeout_at` values from providers — without
  // this guard the countdown would render "NaNh NaNm" rather than bailing.
  if (!Number.isFinite(parsed)) return null;
  const remaining = parsed - now;
  if (remaining <= 0) {
    return <EuiBadge color="danger">{i18n.TIMEOUT_EXPIRED_LABEL}</EuiBadge>;
  }

  return (
    <EuiBadge color={remaining <= URGENT_THRESHOLD_MS ? 'danger' : 'hollow'}>
      {i18n.getTimeoutRemainingLabel(formatRemaining(remaining))}
    </EuiBadge>
  );
};
