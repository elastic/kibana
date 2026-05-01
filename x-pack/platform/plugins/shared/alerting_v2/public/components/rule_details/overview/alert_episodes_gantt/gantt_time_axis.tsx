/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const DAY_MS = 24 * 60 * 60 * 1000;

interface Tick {
  ms: number;
  label: string;
}

const buildDailyTicks = (gteMs: number, lteMs: number, locale: string): Tick[] => {
  if (!Number.isFinite(gteMs) || !Number.isFinite(lteMs) || lteMs <= gteMs) return [];

  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const ticks: Tick[] = [];
  // Snap to the next UTC midnight at or after gteMs.
  const startDay = new Date(gteMs);
  startDay.setUTCHours(0, 0, 0, 0);
  let cursor = startDay.getTime();
  if (cursor < gteMs) cursor += DAY_MS;

  while (cursor <= lteMs) {
    ticks.push({ ms: cursor, label: formatter.format(new Date(cursor)) });
    cursor += DAY_MS;
  }
  return ticks;
};

export interface GanttTimeAxisProps {
  gteMs: number;
  lteMs: number;
}

/**
 * Top-of-chart date axis. Renders one subdued label per UTC day inside the
 * window, positioned by absolute percentage offset against the time domain
 * shared with the bars below — guarantees pixel-aligned ticks without an
 * elastic-charts wrapper.
 */
export const GanttTimeAxis: React.FC<GanttTimeAxisProps> = ({ gteMs, lteMs }) => {
  const { euiTheme } = useEuiTheme();
  const ticks = useMemo(() => buildDailyTicks(gteMs, lteMs, i18n.getLocale()), [gteMs, lteMs]);
  const span = lteMs - gteMs;

  return (
    <div
      css={css`
        position: relative;
        height: ${euiTheme.size.l};
        border-bottom: 1px solid ${euiTheme.colors.lightShade};
      `}
      data-test-subj="ganttTimeAxis"
    >
      {ticks.map((tick) => (
        <div
          key={tick.ms}
          css={css`
            position: absolute;
            top: 0;
            transform: translateX(-50%);
            padding: 0 ${euiTheme.size.xs};
          `}
          style={{ left: `${((tick.ms - gteMs) / span) * 100}%` }}
        >
          <EuiText size="xs" color="subdued">
            {tick.label}
          </EuiText>
        </div>
      ))}
    </div>
  );
};
