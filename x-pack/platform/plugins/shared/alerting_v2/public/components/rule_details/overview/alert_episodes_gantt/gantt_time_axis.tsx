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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const TARGET_TICK_COUNT = 7;

interface Tick {
  ms: number;
  label: string;
}

interface StepDef {
  ms: number;
  /** 'day' = snap to local midnight; 'hour' = snap to local hour; 'minute' = snap to local minute. */
  unit: 'minute' | 'hour' | 'day';
}

// Ordered smallest → largest. Picked so adjacent steps are nice multiples.
const STEPS: StepDef[] = [
  { ms: 5 * MINUTE_MS, unit: 'minute' },
  { ms: 15 * MINUTE_MS, unit: 'minute' },
  { ms: 30 * MINUTE_MS, unit: 'minute' },
  { ms: HOUR_MS, unit: 'hour' },
  { ms: 3 * HOUR_MS, unit: 'hour' },
  { ms: 6 * HOUR_MS, unit: 'hour' },
  { ms: 12 * HOUR_MS, unit: 'hour' },
  { ms: DAY_MS, unit: 'day' },
  { ms: 2 * DAY_MS, unit: 'day' },
  { ms: 7 * DAY_MS, unit: 'day' },
  { ms: 14 * DAY_MS, unit: 'day' },
  { ms: 30 * DAY_MS, unit: 'day' },
];

const pickStep = (spanMs: number): StepDef => {
  // Smallest step that still keeps the tick count <= TARGET_TICK_COUNT-ish.
  for (const step of STEPS) {
    if (spanMs / step.ms <= TARGET_TICK_COUNT + 2) return step;
  }
  return STEPS[STEPS.length - 1];
};

const snapForward = (ms: number, step: StepDef): number => {
  const d = new Date(ms);
  if (step.unit === 'day') {
    d.setHours(0, 0, 0, 0);
  } else if (step.unit === 'hour') {
    d.setMinutes(0, 0, 0);
  } else {
    d.setSeconds(0, 0);
  }
  let cursor = d.getTime();
  while (cursor < ms) cursor += step.ms;
  return cursor;
};

const buildTicks = (gteMs: number, lteMs: number, locale: string): Tick[] => {
  if (!Number.isFinite(gteMs) || !Number.isFinite(lteMs) || lteMs <= gteMs) return [];

  const span = lteMs - gteMs;
  const step = pickStep(span);

  // Label format: time-only when the whole window fits in one local day, otherwise
  // include the date so adjacent days stay distinguishable.
  const showDate = step.unit === 'day' || span > DAY_MS;
  const showTime = step.unit !== 'day';
  const formatter = new Intl.DateTimeFormat(locale, {
    month: showDate ? 'short' : undefined,
    day: showDate ? 'numeric' : undefined,
    hour: showTime ? '2-digit' : undefined,
    minute: showTime ? '2-digit' : undefined,
    hour12: false,
  });

  const ticks: Tick[] = [];
  let cursor = snapForward(gteMs, step);
  // Cap iterations defensively in case of pathological inputs.
  let i = 0;
  while (cursor <= lteMs && i++ < 200) {
    ticks.push({ ms: cursor, label: formatter.format(new Date(cursor)) });
    cursor += step.ms;
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
  const ticks = useMemo(() => buildTicks(gteMs, lteMs, i18n.getLocale()), [gteMs, lteMs]);
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
      {ticks.map((tick) => {
        const pct = ((tick.ms - gteMs) / span) * 100;
        // Labels are left-anchored at their tick position, so a tick close to
        // the right edge would overflow the panel. Skip those — the next tick
        // would have shown the label anyway.
        if (pct > 90) return null;
        return (
          <div
            key={tick.ms}
            css={css`
              position: absolute;
              top: 0;
              padding-right: ${euiTheme.size.s};
              white-space: nowrap;
            `}
            style={{ left: `${pct}%` }}
          >
            <EuiText size="xs" color="subdued">
              {tick.label}
            </EuiText>
          </div>
        );
      })}
    </div>
  );
};
