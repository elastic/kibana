/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../../model/format';
import type { Tone } from '../../model/tone';
import type { ChartReading } from '../../render/surfaces';
import { glyph } from '../../theme/glyph';

import { type GaugeBand, resolveGauge } from './model';
import type { GaugeNode } from './schema';

/** Words the text surfaces print, in one place. */
const copy = {
  columns: {
    value: 'Value',
    target: 'Target',
    range: 'Range',
    band: 'Band',
  },
  noValue: (title: string) => `${title} has no value.`,
  ofMax: (title: string, value: string, max: string) => `${title} is ${value} of ${max}`,
  onScale: (title: string, value: string, min: string, max: string) =>
    `${title} is ${value} on a scale of ${min} to ${max}`,
  inBand: (band: string) => `in ${band}`,
  inToneBand: (tone: Tone) => `in the ${tone} band`,
  bandCell: (tone: Tone) => `${tone[0]!.toUpperCase()}${tone.slice(1)}`,
  outside: { above: 'above the range', below: 'below the range' },
  outsideCell: { above: 'Above the range', below: 'Below the range' },
  onTarget: 'on target',
  offTarget: (gap: string, side: 'under' | 'over') => `${gap} ${side} target`,
  clauses: (clauses: readonly string[]) => `${clauses.join(', ')}.`,
};

const bandClause = ({ label, tone }: GaugeBand): string =>
  label === undefined ? copy.inToneBand(tone) : copy.inBand(label);

/** One sentence: the value against the range, the band or side it falls on, and its distance from target. */
const summary = (node: GaugeNode): string => {
  const { format, title } = node;
  const { value, min, max, range, band, target } = resolveGauge(node);
  if (value === null) {
    return copy.noValue(title);
  }
  const print = (at: number) => formatValue(at, format);
  const clauses = [
    min === 0
      ? copy.ofMax(title, print(value), print(max))
      : copy.onScale(title, print(value), print(min), print(max)),
  ];
  if (range === 'above' || range === 'below') {
    clauses.push(copy.outside[range]);
  } else if (band) {
    clauses.push(bandClause(band));
  }
  if (target !== undefined) {
    clauses.push(
      value === target
        ? copy.onTarget
        : copy.offTarget(print(Math.abs(value - target)), value < target ? 'under' : 'over')
    );
  }
  return copy.clauses(clauses);
};

const bandCell = (node: GaugeNode): string => {
  const { range, band } = resolveGauge(node);
  if (range === 'above' || range === 'below') {
    return copy.outsideCell[range];
  }
  return band ? band.label ?? copy.bandCell(band.tone) : glyph.missing;
};

/** One row: the value, then the target, the range, and the band where the node has them. */
export const read = (node: GaugeNode): ChartReading => {
  const { value, format, target, bands, domain } = node;
  const print = (at: number | null) => formatValue(at, format);
  const cells: [string, string][] = [
    [copy.columns.value, print(value)],
    ...(target === undefined ? [] : [[copy.columns.target, print(target)] as [string, string]]),
    [copy.columns.range, `${print(domain.min)}${glyph.range}${print(domain.max)}`],
    ...(bands === undefined ? [] : [[copy.columns.band, bandCell(node)] as [string, string]]),
  ];
  return {
    summary: summary(node),
    table: {
      columns: cells.map(([column]) => column),
      rows: [cells.map(([, cell]) => cell)],
    },
  };
};
