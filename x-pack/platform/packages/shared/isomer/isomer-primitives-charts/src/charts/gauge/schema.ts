/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import { crossRefine } from '../../model/cross_field';
import { formatSchema } from '../../model/format';
import { wholeChartSelectionSchema } from '../../model/selection';
import { chartHeading, labelText, MAX_DATA_POINTS } from '../../model/text';
import { toneSchema } from '../../model/tone';

const domainRule = '`min` is below `max`';
const spanRule = '`max - min` is finite';
const targetRule = '`target` lies within `domain`, ends included';
const ascendingRule =
  'each band’s `to` is above the previous band’s, and the first band’s above `domain.min`';
const withinRule = 'the last band’s `to` is at most `domain.max`';
const gapRule = '`value - target` is finite';

const bandSchema = z
  .object({
    to: z
      .number()
      .describe(
        'Where the band ends; it starts where the previous band ends, the first at `domain.min`.'
      ),
    tone: toneSchema(),
    label: labelText()
      .describe('The status the band names, e.g. `Healthy` or `Over budget`.')
      .optional(),
  })
  .strict();

export const schema = z
  .object({
    type: z.literal('gauge'),
    ...chartHeading,
    title: labelText().describe(
      'What the value measures, e.g. `Disk used on es-data-01` or `Checkout p95 latency`. Required, since a number with no name tells a reader nothing.'
    ),
    value: z
      .number()
      .nullable()
      .describe(
        'The measured value, or `null` when there is none. A value outside `domain` is valid: it draws clamped to the nearer end and reads as above or below the range.'
      ),
    format: formatSchema().optional(),
    domain: z
      .object({
        min: z.number().describe('The low end of the range.'),
        max: z.number().describe('The high end of the range.'),
      })
      .strict()
      .check(
        crossRefine(({ min, max }) => min < max, {
          error: domainRule,
          path: ['max'],
          rule: domainRule,
        })
      )
      .check(
        crossRefine(({ min, max }) => Number.isFinite(max - min), {
          error: spanRule,
          path: ['max'],
          rule: spanRule,
        })
      )
      .describe(
        `The range the value is read against, e.g. \`{ "min": 0, "max": 1 }\` for a ratio; ${domainRule}; ${spanRule}.`
      ),
    target: z
      .number()
      .describe(
        `The value aimed for, drawn as a marker, e.g. an SLO or a budget; ${targetRule}; ${gapRule}.`
      )
      .optional(),
    bands: z
      .array(bandSchema)
      .min(1)
      .max(MAX_DATA_POINTS)
      .describe(
        `Status ranges in order from \`domain.min\`; ${ascendingRule}; ${withinRule}. A value on a boundary falls in the band that starts there; the last band includes its \`to\`. Order tones by meaning: put \`danger\` first when low is bad. The band the value is in is derived; never author it.`
      )
      .optional(),
    shape: z
      .enum(['arc', 'bar'])
      .describe(
        '`arc` gives one headline value emphasis; `bar` is a horizontal bullet for several values compared or little room. Defaults to `arc`.'
      )
      .optional(),
    selection: wholeChartSelectionSchema().optional(),
  })
  .strict()
  .check(
    crossRefine(
      ({ target, domain: { min, max } }) =>
        target === undefined || (target >= min && target <= max),
      { error: targetRule, path: ['target'], rule: targetRule }
    )
  )
  .check(
    crossRefine(
      ({ value, target }) =>
        value === null || target === undefined || Number.isFinite(value - target),
      { error: gapRule, path: ['target'], rule: gapRule }
    )
  )
  .check(
    crossRefine(
      ({ bands, domain: { min } }) =>
        bands === undefined ||
        bands.length > MAX_DATA_POINTS ||
        bands.every(({ to }, index) => to > (index === 0 ? min : bands[index - 1]!.to)),
      { error: ascendingRule, path: ['bands'], rule: ascendingRule }
    )
  )
  .check(
    crossRefine(
      ({ bands, domain: { max } }) => bands === undefined || bands[bands.length - 1]!.to <= max,
      { error: withinRule, path: ['bands'], rule: withinRule }
    )
  )
  .describe('One value against a range, a target, and status bands.');

/** One value against a range, an optional target, and status bands, as an arc or a bar. */
export type GaugeNode = z.infer<typeof schema> & PrimitiveNode;
