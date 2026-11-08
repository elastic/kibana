/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationEvidence } from '../evidence';

const CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:Z|UTC)?$/i;

/**
 * A time written as a clock reading, "16:30" or "16:30Z", as ISO 8601 UTC on the day of
 * `reference`. Anything else comes back unchanged. A model often writes a short window this way,
 * and a chart cannot place a time that has no day.
 */
export const clockTimeToIso = (text: string, reference: string): string => {
  const clock = CLOCK.exec(text.trim());
  const referenceMs = Date.parse(reference);
  if (!clock || Number.isNaN(referenceMs)) {
    return text;
  }
  const [, hours, minutes, seconds = '00'] = clock;
  const day = new Date(referenceMs).toISOString().slice(0, 10);
  const iso = `${day}T${hours.padStart(2, '0')}:${minutes}:${seconds}Z`;
  return Number.isNaN(Date.parse(iso)) ? text : iso;
};

/** The evidence with the clock readings on a time chart's axis and annotations made full times. */
export const withChartClockTimesDated = (
  evidence: InvestigationEvidence,
  reference: string
): InvestigationEvidence => {
  const { chart } = evidence;
  if (!chart || chart.x_axis.type !== 'time') {
    return evidence;
  }
  const date = (x: string) => clockTimeToIso(x, reference);
  return {
    ...evidence,
    chart: {
      ...chart,
      series: chart.series.map((series) => ({
        ...series,
        points: series.points.map((point) => ({ ...point, x: date(point.x) })),
      })),
      ...(chart.annotations
        ? {
            annotations: chart.annotations.map((annotation) => ({
              ...annotation,
              x: date(annotation.x),
              ...(annotation.x_end ? { x_end: date(annotation.x_end) } : {}),
            })),
          }
        : {}),
    },
  };
};
