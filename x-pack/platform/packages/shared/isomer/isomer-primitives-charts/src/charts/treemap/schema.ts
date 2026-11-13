/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import { crossSuperRefine } from '../../model/cross_field';
import { formatSchema } from '../../model/format';
import { keyOf } from '../../model/identity';
import { selectionKeysRule, selectionSchema, unknownSelectionKeys } from '../../model/selection';
import { chartHeading, labelText, MAX_DATA_POINTS } from '../../model/text';

import { MAX_TREE_DEPTH, walkTree } from './walk';

export interface TreemapItem {
  key?: string | undefined;
  label: string;
  value?: number | undefined;
  children?: TreemapItem[] | undefined;
}

/** Relative tolerance, so sums of decimals such as 0.1 + 0.2 match the 0.3 their parent states. */
const nearlyEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const keysRule = 'item keys are unique across the whole tree';
const leafRule = 'an item without `children` has a `value`';
const sumRule = 'a parent’s `value`, when given, equals the sum of its children’s values';
const depthRule = `items nest at most ${MAX_TREE_DEPTH} levels deep`;
const countRule = `the tree holds at most ${MAX_DATA_POINTS} items`;
const finiteTotalRule = 'the values sum to a finite total';

const itemSchema: z.ZodType<TreemapItem> = z
  .object({
    key: labelText()
      .describe(
        `Stable identity of this item. Defaults to its label; set it when labels repeat anywhere in the tree or a selection binds to it; ${keysRule}, not just among siblings, since a selection resolves a click to the keys from the top-level item down.`
      )
      .optional(),
    label: labelText().describe('The item as the chart and table print it.'),
    value: z
      .number()
      .min(0)
      .describe(
        `The item’s size, zero or more; ${leafRule}; ${sumRule}, so a parent may leave it out.`
      )
      .optional(),
    get children() {
      return z
        .array(itemSchema)
        .min(1)
        .describe(
          `The items nested inside this one, in drawing order. Leave out for a leaf; ${depthRule}.`
        )
        .optional();
    },
  })
  .strict()
  .describe('One part of the whole: a leaf with a `value`, or a parent of `children`.');

export const schema = z
  .object({
    type: z.literal('treemap'),
    ...chartHeading,
    items: z
      .array(itemSchema)
      .min(1)
      .describe(
        `The top-level items, whose values sum to the whole, in drawing order; ${keysRule}; ${countRule}; ${depthRule}; ${finiteTotalRule}.`
      ),
    layout: z
      .enum(['rectangles', 'rings'])
      .describe(
        '`rectangles` nests each item’s children inside its rectangle; `rings` draws each level as a ring around the one above it (a sunburst). Defaults to `rectangles`.'
      )
      .optional(),
    format: formatSchema().optional(),
    selection: selectionSchema(['path']).optional(),
  })
  .strict()
  .check(
    crossSuperRefine(
      ({ items, selection }, context) => {
        const { nodes, tooDeep } = walkTree(items);
        if (nodes.length > MAX_DATA_POINTS) {
          context.addIssue({
            code: 'custom',
            message: countRule,
            path: ['items'],
          });
          return;
        }
        if (tooDeep.size > 0) {
          for (const index of tooDeep) {
            context.addIssue({
              code: 'custom',
              message: depthRule,
              path: [...nodes[index]!.path, 'children'],
            });
          }
          return;
        }
        const sums = nodes.map(() => 0);
        const unequal: number[] = [];
        let total = 0;
        for (let index = nodes.length - 1; index >= 0; index -= 1) {
          const { item, parent, path } = nodes[index]!;
          const { children, value } = item;
          if (children === undefined && value === undefined) {
            context.addIssue({
              code: 'custom',
              message: leafRule,
              path: [...path, 'value'],
            });
          }
          if (children !== undefined && value !== undefined && !nearlyEqual(value, sums[index]!)) {
            unequal.push(index);
          }
          const leaf = typeof value === 'number' ? value : 0;
          const sum = children === undefined ? leaf : sums[index]!;
          if (parent === undefined) {
            total += sum;
          } else {
            sums[parent]! += sum;
          }
        }
        if (!Number.isFinite(total)) {
          context.addIssue({
            code: 'custom',
            message: finiteTotalRule,
            path: ['items'],
          });
        } else {
          for (const index of unequal) {
            context.addIssue({
              code: 'custom',
              message: sumRule,
              path: [...nodes[index]!.path, 'value'],
            });
          }
        }
        const keys = new Set<string>();
        for (const { item, path } of nodes) {
          const key = keyOf(item);
          if (keys.has(key)) {
            context.addIssue({
              code: 'custom',
              message: keysRule,
              path: [...path, 'key'],
            });
          }
          keys.add(key);
        }
        for (const unknown of unknownSelectionKeys(selection, { path: keys })) {
          context.addIssue({
            code: 'custom',
            message: `${selectionKeysRule}: ${unknown}`,
            path: ['selection', 'on'],
          });
        }
      },
      [countRule, depthRule, leafRule, sumRule, finiteTotalRule, keysRule, selectionKeysRule]
    )
  )
  .describe('Nested parts of one whole.');

/** Nested parts of one whole, drawn as nested rectangles or as rings. */
export type TreemapNode = z.infer<typeof schema> & PrimitiveNode;
