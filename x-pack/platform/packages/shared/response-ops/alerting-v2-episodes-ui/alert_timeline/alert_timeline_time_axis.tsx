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

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const TARGET_TICK_COUNT = 7;

interface Tick {
  ms: number;
  label: string;
}

interface StepDef {
  ms: number;
  unit: 'second' | 'minute' | 'hour' | 'day';
}

const STEPS: StepDef[] = [
  { ms: 10 * SECOND_MS, unit: 'second' },
  { ms: 30 * SECOND_MS, unit: 'second' },
  { ms: MINUTE_MS, unit: 'minute' },
  { ms: 2 * MINUTE_MS, unit: 'minute' },
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

const pickStep = (spanMs: number): StepDef =>
  STEPS.find((step) => spanMs / step.ms <= TARGET_TICK_COUNT + 2) ?? STEPS[STEPS.length - 1];

const snapForward = (ms: number, step: StepDef): number => {
  const date = new Date(ms);
  if (step.unit === 'day') date.setHours(0, 0, 0, 0);
  else if (step.unit === 'hour') date.setMinutes(0, 0, 0);
  else if (step.unit === 'minute') date.setSeconds(0, 0);
  else date.setMilliseconds(0);

  let cursor = date.getTime();
  if (step.unit === 'day') {
    const stepDays = Math.round(step.ms / DAY_MS);
    while (cursor < ms) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + stepDays);
      cursor = next.getTime();
    }
  } else {
    while (cursor < ms) cursor += step.ms;
  }
  return cursor;
};

const buildTicks = (
  windowStartMs: number,
  windowEndMs: number,
  locale: string,
  timeZone?: string
): Tick[] => {
  if (
    !Number.isFinite(windowStartMs) ||
    !Number.isFinite(windowEndMs) ||
    windowEndMs <= windowStartMs
  ) {
    return [];
  }

  const span = windowEndMs - windowStartMs;
  const step = pickStep(span);
  const showDate = step.unit === 'day' || span > DAY_MS;
  const showTime = step.unit !== 'day';
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timeZone && timeZone !== 'Browser' ? timeZone : undefined,
    month: showDate ? 'short' : undefined,
    day: showDate ? 'numeric' : undefined,
    hour: showTime ? '2-digit' : undefined,
    minute: showTime ? '2-digit' : undefined,
    second: step.unit === 'second' ? '2-digit' : undefined,
    hour12: false,
  });

  const ticks: Tick[] = [];
  let cursor = snapForward(windowStartMs, step);
  let index = 0;
  while (cursor <= windowEndMs && index++ < 200) {
    ticks.push({ ms: cursor, label: formatter.format(new Date(cursor)) });
    if (step.unit === 'day') {
      const next = new Date(cursor);
      next.setDate(next.getDate() + Math.round(step.ms / DAY_MS));
      cursor = next.getTime();
    } else {
      cursor += step.ms;
    }
  }
  return ticks;
};

export interface AlertTimelineTimeAxisProps {
  windowStartMs: number;
  windowEndMs: number;
  timeZone?: string;
}

export const AlertTimelineTimeAxis = ({
  windowStartMs,
  windowEndMs,
  timeZone,
}: AlertTimelineTimeAxisProps) => {
  const { euiTheme } = useEuiTheme();
  const ticks = useMemo(
    () => buildTicks(windowStartMs, windowEndMs, i18n.getLocale(), timeZone),
    [windowStartMs, windowEndMs, timeZone]
  );
  const span = windowEndMs - windowStartMs;

  return (
    <div
      css={css`
        position: relative;
        height: ${euiTheme.size.l};
        padding-top: ${euiTheme.size.s};
        border-top: 1px solid ${euiTheme.colors.lightShade};
      `}
      data-test-subj="alertTimelineTimeAxis"
    >
      {ticks.map((tick) => {
        const percentage = ((tick.ms - windowStartMs) / span) * 100;
        if (percentage > 90) return null;
        return (
          <div
            key={tick.ms}
            css={css`
              position: absolute;
              top: 0;
              padding-right: ${euiTheme.size.s};
              white-space: nowrap;
            `}
            style={{ left: `${percentage}%` }}
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
