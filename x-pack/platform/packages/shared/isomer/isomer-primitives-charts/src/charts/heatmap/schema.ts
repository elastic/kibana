/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import { crossRefine, crossSuperRefine } from '../../model/cross_field';
import { formatSchema } from '../../model/format';
import { type Keyed, keyOf, keysAreUnique } from '../../model/identity';
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

import { cellId, DEFAULT_MIDPOINT, unfixedDivergingEnds } from './model';

const axisTitle = labelText().describe('The axis title, e.g. `Host` or `Hour`.').optional();

const categorySchema = z
  .object({
    key: keyField('category'),
    label: labelText().describe('The category as the axis prints it.'),
  })
  .strict();

const categoryKeysRule = 'category keys are unique';
const xCategoryRule = 'when `x.categories` is declared, every cell’s `x` is one of their keys';
const yCategoryRule = 'when `y.categories` is declared, every cell’s `y` is one of their keys';
const xTimeRule = 'on a `time` axis every cell’s `x` is a time';
const yPresenceRule = 'a cell has `y` exactly when the chart declares `y`';
const distinctCellRule = 'no two cells share an `x` and `y`';
const cellsRule = `the chart holds at most ${MAX_DATA_POINTS} cells`;
const gridRule = `its columns times its rows, declared categories included, are at most ${MAX_GRID_CELLS}`;
const domainRule = '`domain.min` is below `domain.max`';
const midpointRule =
  '`midpoint`, 0 when left out, lies strictly between the `domain` ends that are set';
const reachRule =
  'each end `domain` leaves unset, `midpoint` minus or plus its distance to the farthest cell value, is finite';
const bandEndsRule = 'only the first band leaves out `from` and only the last leaves out `to`';
const bandOrderRule =
  'each band’s `from` is below its `to` and at or above the previous band’s `to`';

const categories = (rule: string) =>
  z
    .array(categorySchema)
    .min(1)
    .describe(
      `The categories in axis order. Declare them when order matters or the cells lack some, and use their keys in cells; ${rule}; ${categoryKeysRule}. Leave out to take categories from the cells in first-seen order.`
    )
    .optional();

const xSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('category'),
        title: axisTitle,
        categories: categories(xCategoryRule),
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
  ])
  .describe(
    'The columns: `category` for named items such as hosts or weekdays, `time` for timestamped buckets, ordered by instant.'
  );

const ySchema = z
  .object({
    type: z.literal('category'),
    title: axisTitle,
    categories: categories(yCategoryRule),
  })
  .strict()
  .describe(
    'The rows, top to bottom: named items. Leave out for one row of buckets, and then cells carry no `y`.'
  );

const cellSchema = z
  .object({
    x: labelText().describe(
      `The cell’s column: a category key, or a time (${timeRule}); ${xTimeRule}.`
    ),
    y: labelText().describe(`The cell’s row, a category key; ${yPresenceRule}.`).optional(),
    value: z
      .number()
      .nullable()
      .describe(
        'The value its color shows. `null` marks a measured gap; a cell left out is drawn empty too, as unmeasured.'
      ),
  })
  .strict();

const domainSchema = () =>
  z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .strict()
    .describe(
      `Fixes either end of the scale, e.g. \`{ "min": 0, "max": 1 }\` for a ratio; values beyond an end take its color. Leave out to fit the data; ${domainRule}.`
    )
    .optional();

const bandSchema = z
  .object({
    from: z
      .number()
      .describe('The lowest value in the band. Leave out on the first band.')
      .optional(),
    to: z
      .number()
      .describe(
        'Where the band ends: values below it, and on the last band also equal to it. Leave out on the last band.'
      )
      .optional(),
    tone: toneSchema().optional(),
    label: labelText()
      .describe('What the band means, e.g. `Critical`. Defaults to its range.')
      .optional(),
  })
  .strict();

const colorScaleSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('sequential'),
        domain: domainSchema(),
      })
      .strict(),
    z
      .object({
        type: z.literal('diverging'),
        midpoint: z
          .number()
          .describe(
            `The neutral value the two ramps meet at, e.g. 0 for a change. Defaults to 0; ${midpointRule}; ${reachRule}.`
          )
          .optional(),
        domain: domainSchema(),
      })
      .strict(),
    z
      .object({
        type: z.literal('bands'),
        bands: z
          .array(bandSchema)
          .min(1)
          .describe(
            `Value ranges, low to high, each drawn in one color: its \`tone\` when it marks a status, else a step of the theme’s ramp. A band holds values from its \`from\` up to its \`to\`; ${bandEndsRule}; ${bandOrderRule}. A value outside every band is drawn with no band color and counted in no band; leave the ends open when values may run past them.`
          ),
      })
      .strict(),
  ])
  .describe(
    '`sequential` for magnitude, light to dark; `diverging` for values either side of a midpoint; `bands` for status thresholds. Colors come from the theme. Defaults to `sequential`.'
  );

const keysOf = ({ categories: declared }: { categories?: readonly Keyed[] | undefined }) =>
  declared?.map(keyOf);

export const schema = z
  .object({
    type: z.literal('heatmap'),
    ...chartHeading,
    x: xSchema,
    y: ySchema.optional(),
    cells: z
      .array(cellSchema)
      .describe(
        `One value per column and row, in any order; times compare as instants; ${distinctCellRule}; ${cellsRule}; ${gridRule}.`
      ),
    colorScale: colorScaleSchema.optional(),
    format: formatSchema().optional(),
    selection: selectionSchema(['x', 'y']).optional(),
  })
  .strict()
  .check(
    crossRefine(({ x }) => x.type !== 'category' || keysAreUnique(x.categories ?? []), {
      error: categoryKeysRule,
      path: ['x', 'categories'],
      rule: categoryKeysRule,
    })
  )
  .check(
    crossRefine(({ y }) => keysAreUnique(y?.categories ?? []), {
      error: categoryKeysRule,
      path: ['y', 'categories'],
      rule: categoryKeysRule,
    })
  )
  .check(
    crossRefine(({ cells }) => cells.length <= MAX_DATA_POINTS, {
      error: cellsRule,
      path: ['cells'],
      rule: cellsRule,
    })
  )
  .check(
    crossRefine(
      ({ x, y, cells }) => {
        if (cells.length > MAX_DATA_POINTS) {
          return true;
        }
        const columns = new Set<unknown>([
          ...(x.type === 'category' ? keysOf(x) ?? [] : []),
          ...cells.map((cell) => (x.type === 'time' ? timeValue(cell.x) : cell.x)),
        ]).size;
        const rows = y
          ? new Set([...(keysOf(y) ?? []), ...cells.flatMap((cell) => cell.y ?? [])]).size
          : 1;
        return columns * rows <= MAX_GRID_CELLS;
      },
      { error: gridRule, path: ['cells'], rule: gridRule }
    )
  )
  .check(
    crossSuperRefine(
      ({ x, y, cells }, context) => {
        if (cells.length > MAX_DATA_POINTS) {
          return;
        }
        const xDeclared = x.type === 'category' ? keysOf(x) : undefined;
        const xKeys = xDeclared && new Set(xDeclared);
        const yDeclared = y && keysOf(y);
        const yKeys = yDeclared && new Set(yDeclared);
        const seen = new Set<string>();
        cells.forEach((cell, index) => {
          const path = (field: string) => ['cells', index, field];
          if (x.type === 'time' && !isTime(cell.x)) {
            context.addIssue({
              code: 'custom',
              message: xTimeRule,
              path: path('x'),
            });
            return;
          }
          if (xKeys && !xKeys.has(cell.x)) {
            context.addIssue({
              code: 'custom',
              message: xCategoryRule,
              path: path('x'),
            });
          }
          if ((y === undefined) !== (cell.y === undefined)) {
            context.addIssue({
              code: 'custom',
              message: yPresenceRule,
              path: path('y'),
            });
            return;
          }
          if (yKeys && cell.y !== undefined && !yKeys.has(cell.y)) {
            context.addIssue({
              code: 'custom',
              message: yCategoryRule,
              path: path('y'),
            });
          }
          const id = cellId(x.type, cell);
          if (seen.has(id)) {
            context.addIssue({
              code: 'custom',
              message: distinctCellRule,
              path: ['cells', index],
            });
          }
          seen.add(id);
        });
      },
      [xTimeRule, xCategoryRule, yPresenceRule, yCategoryRule, distinctCellRule]
    )
  )
  .check(
    crossSuperRefine(
      ({ x, cells }, context) => {
        if (x.type !== 'time' || cells.length > MAX_DATA_POINTS) {
          return;
        }
        for (const { index, rule } of timeAxisIssues(cells.map((cell) => cell.x))) {
          if (rule !== timeRule) {
            context.addIssue({
              code: 'custom',
              message: rule,
              path: ['cells', index, 'x'],
            });
          }
        }
      },
      [timeKindRule, timeSpellingRule]
    )
  )
  .check(
    crossRefine(
      ({ colorScale }) => {
        if (colorScale === undefined || colorScale.type === 'bands') {
          return true;
        }
        const { min, max } = colorScale.domain ?? {};
        return min === undefined || max === undefined || min < max;
      },
      { error: domainRule, path: ['colorScale', 'domain'], rule: domainRule }
    )
  )
  .check(
    crossRefine(
      ({ colorScale }) => {
        if (colorScale?.type !== 'diverging') {
          return true;
        }
        const { midpoint = DEFAULT_MIDPOINT, domain = {} } = colorScale;
        const { min, max } = domain;
        return (min === undefined || min < midpoint) && (max === undefined || midpoint < max);
      },
      {
        error: midpointRule,
        path: ['colorScale', 'midpoint'],
        rule: midpointRule,
      }
    )
  )
  .check(
    crossRefine(
      ({ colorScale, cells }) => {
        if (colorScale?.type !== 'diverging' || cells.length > MAX_DATA_POINTS) {
          return true;
        }
        const { midpoint = DEFAULT_MIDPOINT, domain = {} } = colorScale;
        return unfixedDivergingEnds(
          midpoint,
          domain,
          cells.flatMap(({ value }) => (value === null ? [] : [value]))
        ).every(Number.isFinite);
      },
      {
        error: reachRule,
        path: ['colorScale', 'midpoint'],
        rule: reachRule,
      }
    )
  )
  .check(
    crossSuperRefine(
      ({ colorScale }, context) => {
        if (colorScale?.type !== 'bands') {
          return;
        }
        const { bands } = colorScale;
        const last = bands.length - 1;
        bands.forEach(({ from, to }, index) => {
          const path = ['colorScale', 'bands', index];
          if ((from === undefined && index > 0) || (to === undefined && index < last)) {
            context.addIssue({ code: 'custom', message: bandEndsRule, path });
            return;
          }
          const previous = bands[index - 1]?.to;
          if (
            (from !== undefined && to !== undefined && from >= to) ||
            (from !== undefined && previous !== undefined && from < previous)
          ) {
            context.addIssue({ code: 'custom', message: bandOrderRule, path });
          }
        });
      },
      [bandEndsRule, bandOrderRule]
    )
  )
  .check(
    crossSuperRefine(
      ({ x, y, cells, selection }, context) => {
        if (cells.length > MAX_DATA_POINTS) {
          return;
        }
        const declared = (axis: 'x' | 'y', categoryKeys: string[] | undefined): Set<string> =>
          new Set(
            categoryKeys ??
              cells.flatMap((cell) => {
                const value = cell[axis];
                return value === undefined ? [] : [value];
              })
          );
        for (const unknown of unknownSelectionKeys(selection, {
          x: declared('x', x.type === 'category' ? keysOf(x) : undefined),
          y: y ? declared('y', keysOf(y)) : new Set(),
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
  .describe('A value per cell of a grid, read by color.');

/** A value per cell of one or two dimensions, read by color intensity. */
export type HeatmapNode = z.infer<typeof schema> & PrimitiveNode;
