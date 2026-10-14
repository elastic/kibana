/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import { crossRefine, crossSuperRefine } from '../../model/cross_field';
import { formatSchema } from '../../model/format';
import { keyOf, keysAreUnique } from '../../model/identity';
import { selectionKeysRule, selectionSchema, unknownSelectionKeys } from '../../model/selection';
import {
  chartHeading,
  keyField,
  labelText,
  MAX_DATA_POINTS,
  MAX_GRID_CELLS,
} from '../../model/text';
import {
  granularitySchema,
  isTime,
  timeAxisIssues,
  timeKindRule,
  timeRule,
  timeSpellingRule,
  timeValue,
  timeZoneSchema,
} from '../../model/time';
import { toneSchema } from '../../model/tone';

const axisTitle = labelText().describe('The axis title, e.g. `Host` or `Requests`.').optional();

const categorySchema = z
  .object({
    key: keyField('category'),
    label: labelText().describe('The category as the axis prints it.'),
  })
  .strict();

const categoryKeysRule = 'category keys are unique';
const xTypeRule =
  'every point’s `x` is a string for `category`, a time for `time`, and a number for `number`';
const categoryRule = 'when `categories` is declared, every point’s `x` is one of their keys';

const xSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('category'),
        title: axisTitle,
        categories: z
          .array(categorySchema)
          .min(1)
          .describe(
            `The categories in axis order. Declare them when order matters or a series lacks some, and use their keys as point \`x\`; ${categoryRule}; ${categoryKeysRule}. Leave out to take categories from the points in first-seen order.`
          )
          .optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal('time'),
        title: axisTitle,
        timeZone: timeZoneSchema().optional(),
        granularity: granularitySchema().optional(),
      })
      .strict()
      .describe(`Times as ISO 8601; ${timeKindRule}; ${timeSpellingRule}.`),
    z
      .object({
        type: z.literal('number'),
        title: axisTitle,
        format: formatSchema().optional(),
      })
      .strict(),
  ])
  .describe(
    'The x axis: `category` for named items, `time` for timestamps, `number` for a numeric measure. Points are ordered by it: declared or first-seen categories, ascending time, ascending number.'
  );

const logRule =
  'a `log` axis has every value on it above zero, its `domain.min` and thresholds included';
const domainRule = '`domain.min` is below `domain.max` when both are set';

const yAxisSchema = z
  .object({
    title: axisTitle,
    format: formatSchema().optional(),
    scale: z.enum(['linear', 'log']).describe(`Defaults to \`linear\`; ${logRule}.`).optional(),
    domain: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .strict()
      .check(
        crossRefine(({ min, max }) => min === undefined || max === undefined || min < max, {
          error: domainRule,
          rule: domainRule,
        })
      )
      .describe(
        `Fixes either end of the axis, e.g. \`{ "min": 0, "max": 1 }\` for a ratio. Leave out to fit the data; ${domainRule}.`
      )
      .optional(),
  })
  .strict();

const pointSchema = z
  .object({
    x: z
      .union([z.string(), z.number()])
      .describe(
        `Where the point sits on x: a category key, a time (${timeRule}), or a number; ${xTypeRule}.`
      ),
    y: z.number().nullable().describe('The value. `null` marks a measured gap, drawn as a break.'),
  })
  .strict();

const seriesSchema = z
  .object({
    key: keyField('series'),
    label: labelText().describe('The series name the legend prints.'),
    kind: z
      .enum(['line', 'area', 'bar'])
      .describe('How the series draws. Defaults to `line`.')
      .optional(),
    axis: z
      .enum(['y', 'y2'])
      .describe('The value axis it reads against. Defaults to `y`.')
      .optional(),
    points: z.array(pointSchema).describe('Its points, each at a distinct `x`, in any order.'),
  })
  .strict();

const thresholdSchema = z
  .object({
    value: z.number().describe('Where the line sits on its axis.'),
    label: labelText().describe('What the line marks, e.g. `SLO`.').optional(),
    tone: toneSchema().optional(),
    axis: z.enum(['y', 'y2']).describe('Defaults to `y`.').optional(),
  })
  .strict();

const distinctXRule = 'no series has two points at the same `x`';
const y2Rule = '`y2` is declared exactly when a series or threshold reads against it';
const horizontalRule = '`horizontal` needs `category` x and every series a `bar`';
const pointsRule = `the chart holds at most ${MAX_DATA_POINTS} points`;
const gridRule = `its distinct \`x\` positions, declared categories included, times its series are at most ${MAX_GRID_CELLS}`;
const seriesKeysRule = 'series keys are unique';
const stackTotalRule = 'when series stack, their values at each `x` sum to a finite total';

const pointCount = (series: readonly { points: readonly unknown[] }[]) =>
  series.reduce((sum, { points }) => sum + points.length, 0);

export const schema = z
  .object({
    type: z.literal('xyChart'),
    ...chartHeading,
    x: xSchema,
    y: yAxisSchema.describe('The left value axis.').optional(),
    y2: yAxisSchema.describe(`A right value axis, for a second unit. ${y2Rule}.`).optional(),
    series: z
      .array(seriesSchema)
      .min(1)
      .describe(
        `The series, drawn and listed in this order; ${seriesKeysRule}; ${distinctXRule}; ${pointsRule}; ${gridRule}.`
      ),
    stack: z
      .enum(['none', 'stacked', 'percent', 'silhouette'])
      .describe(
        `How bar and area series on the same axis combine: \`stacked\` sums them, \`percent\` shows each as a share of the total at that x, \`silhouette\` centres the stack (a stream graph). Line series never stack. Defaults to \`none\`; ${stackTotalRule}.`
      )
      .optional(),
    missing: z
      .enum(['gap', 'zero', 'carry', 'linear'])
      .describe(
        'How a series draws at an x other series have and it lacks: a `gap`, `zero`, the last value carried, or a `linear` bridge. Tables print it as missing either way. Defaults to `gap`.'
      )
      .optional(),
    orientation: z
      .enum(['vertical', 'horizontal'])
      .describe(`\`horizontal\` lays bars along x; ${horizontalRule}. Defaults to \`vertical\`.`)
      .optional(),
    thresholds: z
      .array(thresholdSchema)
      .describe('Reference lines across the plot, e.g. an SLO or a limit.')
      .optional(),
    selection: selectionSchema(['x', 'series']).optional(),
  })
  .strict()
  .check(
    crossRefine(({ series }) => keysAreUnique(series), {
      error: seriesKeysRule,
      path: ['series'],
      rule: seriesKeysRule,
    })
  )
  .check(
    crossRefine(({ x }) => x.type !== 'category' || keysAreUnique(x.categories ?? []), {
      error: categoryKeysRule,
      path: ['x', 'categories'],
      rule: categoryKeysRule,
    })
  )
  .check(
    crossRefine(({ series }) => pointCount(series) <= MAX_DATA_POINTS, {
      error: pointsRule,
      path: ['series'],
      rule: pointsRule,
    })
  )
  .check(
    crossRefine(
      ({ x, series }) => {
        if (pointCount(series) > MAX_DATA_POINTS) {
          return true;
        }
        const positions = new Set<unknown>([
          ...(x.type === 'category' ? (x.categories ?? []).map(keyOf) : []),
          ...series.flatMap(({ points }) =>
            points.map(({ x: at }) => (x.type === 'time' ? timeValue(String(at)) : String(at)))
          ),
        ]).size;
        return positions * series.length <= MAX_GRID_CELLS;
      },
      { error: gridRule, path: ['series'], rule: gridRule }
    )
  )
  .check(
    crossSuperRefine(
      ({ x, series }, context) => {
        if (pointCount(series) > MAX_DATA_POINTS) {
          return;
        }
        const declared =
          x.type === 'category' && x.categories ? new Set(x.categories.map(keyOf)) : undefined;
        series.forEach(({ points }, seriesIndex) => {
          const seen = new Set<string>();
          points.forEach((point, pointIndex) => {
            const path = ['series', seriesIndex, 'points', pointIndex, 'x'];
            const fits =
              x.type === 'number'
                ? typeof point.x === 'number'
                : typeof point.x === 'string' && (x.type === 'category' || isTime(point.x));
            if (!fits) {
              context.addIssue({ code: 'custom', message: xTypeRule, path });
              return;
            }
            if (declared && !declared.has(point.x as string)) {
              context.addIssue({ code: 'custom', message: categoryRule, path });
            }
            const id = x.type === 'time' ? String(timeValue(point.x as string)) : String(point.x);
            if (seen.has(id)) {
              context.addIssue({
                code: 'custom',
                message: distinctXRule,
                path,
              });
            }
            seen.add(id);
          });
        });
      },
      [xTypeRule, categoryRule, distinctXRule]
    )
  )
  .check(
    crossSuperRefine(
      ({ x, series }, context) => {
        if (x.type !== 'time' || pointCount(series) > MAX_DATA_POINTS) {
          return;
        }
        const paths = series.flatMap(({ points }, seriesIndex) =>
          points.map((_, pointIndex) => ['series', seriesIndex, 'points', pointIndex, 'x'])
        );
        const values = series.flatMap(({ points }) => points.map(({ x: value }) => value));
        for (const { index, rule } of timeAxisIssues(values)) {
          if (rule !== timeRule) {
            context.addIssue({
              code: 'custom',
              message: rule,
              path: paths[index]!,
            });
          }
        }
      },
      [timeKindRule, timeSpellingRule]
    )
  )
  .check(
    crossRefine(
      ({ stack, series }) => {
        if ((stack ?? 'none') === 'none') {
          return true;
        }
        const totals = new Map<string, number>();
        for (const { kind, axis = 'y', points } of series) {
          if ((kind ?? 'line') === 'line') {
            continue;
          }
          for (const { x: at, y: value } of points) {
            const id = JSON.stringify([axis, at]);
            totals.set(id, (totals.get(id) ?? 0) + Math.abs(value ?? 0));
          }
        }
        return [...totals.values()].every(Number.isFinite);
      },
      { error: stackTotalRule, path: ['stack'], rule: stackTotalRule }
    )
  )
  .check(
    crossRefine(
      ({ y2, series, thresholds }) =>
        (y2 !== undefined) === [...series, ...(thresholds ?? [])].some(({ axis }) => axis === 'y2'),
      { error: y2Rule, path: ['y2'], rule: y2Rule }
    )
  )
  .check(
    crossRefine(
      ({ orientation, x, series }) =>
        orientation !== 'horizontal' ||
        (x.type === 'category' && series.every(({ kind }) => kind === 'bar')),
      { error: horizontalRule, path: ['orientation'], rule: horizontalRule }
    )
  )
  .check(
    crossRefine(
      ({ y, y2, series, thresholds }) =>
        (['y', 'y2'] as const).every((axis) => {
          const valueAxis = axis === 'y' ? y : y2;
          return (
            valueAxis?.scale !== 'log' ||
            ((valueAxis.domain?.min ?? 1) > 0 &&
              (thresholds ?? [])
                .filter((threshold) => (threshold.axis ?? 'y') === axis)
                .every(({ value }) => value > 0) &&
              series
                .filter((s) => (s.axis ?? 'y') === axis)
                .every(({ points }) => points.every(({ y: value }) => value === null || value > 0)))
          );
        }),
      { error: logRule, path: ['series'], rule: logRule }
    )
  )
  .check(
    crossSuperRefine(
      ({ x, series, selection }, context) => {
        const xKeys = new Set(
          x.type === 'category' && x.categories
            ? x.categories.map(keyOf)
            : series.flatMap(({ points }) => points.map((p) => String(p.x)))
        );
        for (const unknown of unknownSelectionKeys(selection, {
          x: xKeys,
          series: new Set(series.map(keyOf)),
        })) {
          context.addIssue({
            code: 'custom',
            message: `${selectionKeysRule}: ${unknown}`,
            path: ['selection', 'on'],
          });
        }
      },
      [selectionKeysRule]
    )
  )
  .describe('Values over a shared x axis.');

/** Values over a shared x axis: lines, areas, and bars, stacked or not, on one or two value axes. */
export type XyChartNode = z.infer<typeof schema> & PrimitiveNode;
