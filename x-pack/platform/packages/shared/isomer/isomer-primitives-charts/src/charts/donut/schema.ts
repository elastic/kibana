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
import { chartHeading, keyField, labelText, MAX_DATA_POINTS } from '../../model/text';

const partSchema = z
  .object({
    key: keyField('part'),
    label: labelText().describe('The part as the legend and table print it, e.g. `hot`.'),
    value: z
      .number()
      .min(0)
      .describe(
        'The part’s amount in the unit `format` prints, never its percentage: shares are derived from the total. Zero or more.'
      ),
  })
  .strict();

const partKeysRule = 'part keys are unique';
const finiteTotalRule = 'the values sum to a finite total';

const tooManyParts = (parts: readonly unknown[]) => parts.length > MAX_DATA_POINTS;

export const schema = z
  .object({
    type: z.literal('donut'),
    ...chartHeading,
    parts: z
      .array(partSchema)
      .min(2)
      .max(MAX_DATA_POINTS)
      .describe(
        `The parts of one whole, at least two, drawn clockwise and listed in this order; the chart never sorts them; ${partKeysRule}; ${finiteTotalRule}. Do not add a part for the total, which the centre shows.`
      ),
    format: formatSchema()
      .describe('How part values and the total print on every surface.')
      .optional(),
    selection: selectionSchema(['slice']).optional(),
  })
  .strict()
  .check(
    crossRefine(({ parts }) => tooManyParts(parts) || keysAreUnique(parts), {
      error: partKeysRule,
      path: ['parts'],
      rule: partKeysRule,
    })
  )
  .check(
    crossRefine(
      ({ parts }) =>
        tooManyParts(parts) || Number.isFinite(parts.reduce((sum, { value }) => sum + value, 0)),
      { error: finiteTotalRule, path: ['parts'], rule: finiteTotalRule }
    )
  )
  .check(
    crossSuperRefine(
      ({ parts, selection }, context) => {
        if (tooManyParts(parts)) {
          return;
        }
        for (const unknown of unknownSelectionKeys(selection, {
          slice: new Set(parts.map(keyOf)),
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
  .describe('Parts of one whole, read as each part’s share of the total.');

/** Flat parts of one whole, read as shares of their total. */
export type DonutNode = z.infer<typeof schema> & PrimitiveNode;
