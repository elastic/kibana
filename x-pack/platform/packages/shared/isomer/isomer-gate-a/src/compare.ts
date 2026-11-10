/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NormalizedAxis,
  NormalizedChart,
  NormalizedMetric,
  NormalizedSeries,
  NormalizedXy,
  Point,
} from './model';

export interface CompareOptions {
  /** How far, in pixels, geometry may move before it's a difference. */
  tolerance?: number;
}

/** One way the actual chart differs from Kibana's, worded like a review comment. */
export type Difference = string;

const DEFAULT_TOLERANCE = 1;

const show = (value: unknown): string => JSON.stringify(value);

const ordinal = (index: number) => index + 1;

/** Differences between two lists of the same things, by position. */
const compareLists = <T>(
  what: string,
  expected: T[],
  actual: T[],
  compareItem: (label: string, expectedItem: T, actualItem: T) => Difference[]
): Difference[] => {
  const differences: Difference[] = [];
  if (expected.length !== actual.length) {
    differences.push(`${what} count ${expected.length} vs ${actual.length}`);
  }
  const shared = Math.min(expected.length, actual.length);
  for (let index = 0; index < shared; index++) {
    differences.push(...compareItem(`${what} ${ordinal(index)}`, expected[index], actual[index]));
  }
  return differences;
};

const compareField = (label: string, field: string, expected: unknown, actual: unknown) =>
  show(expected) === show(actual) ? [] : [`${label} ${field} ${show(expected)} vs ${show(actual)}`];

const numbersIn = (path: string): number[] =>
  (path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);

const commandsIn = (path: string): string => path.replace(/[^a-z]/gi, '');

const comparePaths = (label: string, expected: string, actual: string, tolerance: number) => {
  if (commandsIn(expected) !== commandsIn(actual)) {
    return [`${label} draws different path commands`];
  }
  const expectedNumbers = numbersIn(expected);
  const actualNumbers = numbersIn(actual);
  const worst = expectedNumbers.reduce(
    (max, value, index) => Math.max(max, Math.abs(value - (actualNumbers[index] ?? NaN))),
    0
  );
  return expectedNumbers.length === actualNumbers.length && worst <= tolerance
    ? []
    : [`${label} moves by ${Number.isNaN(worst) ? 'an unknown amount' : worst.toFixed(2)}px`];
};

const comparePoints = (label: string, expected: Point[], actual: Point[], tolerance: number) =>
  compareLists(label, expected, actual, (pointLabel, expectedPoint, actualPoint) => {
    const distance = Math.max(
      Math.abs(expectedPoint.x - actualPoint.x),
      Math.abs(expectedPoint.y - actualPoint.y)
    );
    return distance <= tolerance ? [] : [`${pointLabel} moves by ${distance.toFixed(2)}px`];
  });

const compareAxis =
  (tolerance: number) =>
  (label: string, expected: NormalizedAxis, actual: NormalizedAxis): Difference[] =>
    [
      ...compareField(label, 'position', expected.position, actual.position),
      ...compareField(label, 'title', expected.title, actual.title),
      ...(expected.labels && actual.labels
        ? compareLists(`${label} label`, expected.labels, actual.labels, (itemLabel, a, b) =>
            a === b ? [] : [`${itemLabel} ${show(a)} vs ${show(b)}`]
          )
        : []),
      ...(expected.values && actual.values
        ? compareField(label, 'values', expected.values, actual.values)
        : []),
      ...(expected.gridlines && actual.gridlines
        ? comparePoints(`${label} gridline`, expected.gridlines, actual.gridlines, tolerance)
        : []),
    ];

const compareSeries =
  (tolerance: number) =>
  (label: string, expected: NormalizedSeries, actual: NormalizedSeries): Difference[] =>
    [
      ...compareField(label, 'mark', expected.mark, actual.mark),
      ...compareField(label, 'name', expected.name, actual.name),
      ...compareField(label, 'color', expected.color, actual.color),
      ...compareLists(`${label} value`, expected.values, actual.values, (itemLabel, a, b) =>
        show(a) === show(b) ? [] : [`${itemLabel} ${show(a)} vs ${show(b)}`]
      ),
      ...(expected.paths && actual.paths
        ? compareLists(`${label} path`, expected.paths, actual.paths, (pathLabel, a, b) =>
            comparePaths(pathLabel, a, b, tolerance)
          )
        : []),
    ];

const compareXy = (expected: NormalizedXy, actual: NormalizedXy, tolerance: number) => [
  ...compareLists('legend item', expected.legend, actual.legend, (label, a, b) => [
    ...compareField(label, 'name', a.name, b.name),
    ...compareField(label, 'color', a.color, b.color),
  ]),
  ...compareLists('axis', expected.axes, actual.axes, compareAxis(tolerance)),
  ...compareLists('series', expected.series, actual.series, compareSeries(tolerance)),
];

const compareMetric = (expected: NormalizedMetric, actual: NormalizedMetric) =>
  compareLists('tile', expected.tiles, actual.tiles, (label, a, b) => [
    ...compareField(label, 'background', a.background, b.background),
    ...compareLists(`${label} text`, a.texts, b.texts, (textLabel, c, d) => [
      ...compareField(textLabel, 'text', c.text, d.text),
      ...compareField(textLabel, 'color', c.color, d.color),
    ]),
  ]);

/**
 * Every way `actual` differs from `expected`, Kibana's. Strings, colors, values and order must
 * match exactly; geometry is compared only where both sides have it, within `tolerance` pixels.
 * An empty list is a pass.
 */
export const compareCharts = (
  expected: NormalizedChart,
  actual: NormalizedChart,
  { tolerance = DEFAULT_TOLERANCE }: CompareOptions = {}
): Difference[] => {
  if (expected.kind !== actual.kind) {
    return [`chart kind ${show(expected.kind)} vs ${show(actual.kind)}`];
  }
  return expected.kind === 'metric'
    ? compareMetric(expected, actual as NormalizedMetric)
    : compareXy(expected, actual as NormalizedXy, tolerance);
};
