/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tone } from '../../model/tone';

import type { GaugeNode } from './schema';

export interface GaugeBand {
  from: number;
  to: number;
  tone: Tone;
  label?: string | undefined;
}

/** A gauge with its defaults applied and its value placed, for every surface. */
export interface ResolvedGauge {
  shape: 'arc' | 'bar';
  min: number;
  max: number;
  /** As authored. */
  value: number | null;
  /** The value clamped into the domain. */
  position: number | null;
  /** {@link ResolvedGauge.position} as a share of the domain, 0 at `min` and 1 at `max`. */
  fraction: number | null;
  /** Where the authored value sits against the domain. */
  range: 'below' | 'within' | 'above' | null;
  target: number | undefined;
  targetFraction: number | undefined;
  bands: readonly GaugeBand[];
  /** The band the value falls in; `undefined` when it is outside the domain or past the last band. */
  band: GaugeBand | undefined;
}

const rangeOf = (value: number, min: number, max: number): ResolvedGauge['range'] =>
  value < min ? 'below' : value > max ? 'above' : 'within';

export const resolveGauge = ({
  value,
  domain: { min, max },
  target,
  bands: authored = [],
  shape = 'arc',
}: GaugeNode): ResolvedGauge => {
  const share = (at: number) => (at - min) / (max - min);
  const bands = authored.map(
    ({ to, tone, label }, index): GaugeBand => ({
      from: index === 0 ? min : authored[index - 1]!.to,
      to,
      tone,
      ...(label === undefined ? {} : { label }),
    })
  );
  const range = value === null ? null : rangeOf(value, min, max);
  const position = value === null ? null : Math.min(max, Math.max(min, value));
  const last = bands.length - 1;
  return {
    shape,
    min,
    max,
    value,
    position,
    fraction: position === null ? null : share(position),
    range,
    target,
    targetFraction: target === undefined ? undefined : share(target),
    bands,
    band:
      value === null || range !== 'within'
        ? undefined
        : bands.find(
            ({ from, to }, index) =>
              value >= from && (value < to || (index === last && value === to))
          ),
  };
};
