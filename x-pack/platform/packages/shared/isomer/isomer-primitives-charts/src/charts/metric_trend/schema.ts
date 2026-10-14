/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import { crossRefine, crossSuperRefine } from '../../model/cross_field';
import { formatSchema } from '../../model/format';
import { wholeChartSelectionSchema } from '../../model/selection';
import { chartHeading, labelText, MAX_DATA_POINTS } from '../../model/text';
import {
  granularitySchema,
  isoTime,
  timeAxisIssues,
  timeKindRule,
  timeRule,
  timeSpellingRule,
  timeValue,
  timeZoneSchema,
} from '../../model/time';
import { toneSchema } from '../../model/tone';

import { MAX_RELATIVE_CHANGE } from './model';

export const distinctTimesRule = 'no two trend points are at the same instant';
export const finiteChangeRule =
  'the change from the previous value to `value` is a finite number, in percentage points too for a `percent` value';

const pointSchema = z
  .object({
    x: isoTime().describe(`When the value was measured; ${timeRule}.`),
    y: z.number().nullable().describe('The value then. `null` marks a measured gap.'),
  })
  .strict();

const trendSchema = z
  .object({
    points: z
      .array(pointSchema)
      .min(2)
      .max(MAX_DATA_POINTS)
      .describe(
        `The recent history, in any order; it is read by time; ${distinctTimesRule}; ${timeKindRule}; ${timeSpellingRule}. The current \`value\` need not equal the last point.`
      ),
    timeZone: timeZoneSchema().optional(),
    granularity: granularitySchema().optional(),
  })
  .strict()
  .check(
    crossSuperRefine(
      ({ points }, context) => {
        if (points.length > MAX_DATA_POINTS) {
          return;
        }
        const times = points.map(({ x }) => x);
        const unreadable = new Set<number>();
        for (const { index, rule } of timeAxisIssues(times)) {
          if (rule === timeRule || rule === timeKindRule) {
            unreadable.add(index);
          }
          if (rule !== timeRule) {
            context.addIssue({
              code: 'custom',
              message: rule,
              path: ['points', index, 'x'],
            });
          }
        }
        const seen = new Set<number>();
        times.forEach((x, index) => {
          if (unreadable.has(index)) {
            return;
          }
          const instant = timeValue(x);
          if (seen.has(instant)) {
            context.addIssue({
              code: 'custom',
              message: distinctTimesRule,
              path: ['points', index, 'x'],
            });
          }
          seen.add(instant);
        });
      },
      [distinctTimesRule, timeKindRule, timeSpellingRule]
    )
  )
  .describe('How the value has moved recently, drawn as a small line behind or beside it.');

export const schema = z
  .object({
    type: z.literal('metricTrend'),
    ...chartHeading,
    title: labelText().describe(
      'The metric the value measures, e.g. `Error rate` or `Log ingest rate`. Required, since a number with no name tells a reader nothing.'
    ),
    value: z
      .number()
      .nullable()
      .describe(
        'The current reading. `null` means there is no current reading, printed as missing.'
      ),
    format: formatSchema()
      .describe(
        'How the value, the previous value, the change, and the trend print. A `percent` value’s change prints in percentage points, so `5%` against `4%` reads "up 1 percentage point".'
      )
      .optional(),
    previous: z
      .object({
        value: z.number().describe('The reading compared against.'),
        label: labelText().describe(
          'The comparison window as it reads after "from", e.g. `yesterday` or `the previous 24 hours`.'
        ),
      })
      .strict()
      .describe(
        `An earlier reading to compare with. The change and its direction are derived from it and worded neutrally, e.g. "up 12% from yesterday"; ${finiteChangeRule}. Only the absolute change prints when the previous value is 0 or the change is at least ${MAX_RELATIVE_CHANGE.toLocaleString(
          'en-US'
        )} times the previous value.`
      )
      .optional(),
    trend: trendSchema.optional(),
    tone: toneSchema()
      .describe(
        'The status of the current value, set by the author, e.g. `danger` for an error rate past its SLO, printed with the value as "with danger status". Direction alone never sets it: up is not good and down is not bad. Leave out when there is no status.'
      )
      .optional(),
    selection: wholeChartSelectionSchema().optional(),
  })
  .strict()
  .check(
    crossRefine(
      ({ value, previous, format }) => {
        if (value === null || previous === undefined) {
          return true;
        }
        const change = value - previous.value;
        return Number.isFinite(format?.style === 'percent' ? change * 100 : change);
      },
      {
        error: finiteChangeRule,
        path: ['previous', 'value'],
        rule: finiteChangeRule,
      }
    )
  )
  .describe('One headline value with its recent direction.');

/** One headline value with its change from a previous reading and an optional recent history. */
export type MetricTrendNode = z.infer<typeof schema> & PrimitiveNode;
