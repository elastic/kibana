/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The selection contract: predicates per named dimension, keyed by item key, with the author's event name
// and context.

import { type ActionEventRef, z } from '@elastic/isomer-sdk';

import { crossRefine } from './cross_field';
import { labelText } from './text';

export const SELECTION_DIMENSIONS = ['x', 'y', 'series', 'slice', 'path'] as const;

export type SelectionDimension = (typeof SELECTION_DIMENSIONS)[number];

/** What a click resolved to: an item key per dimension, `path` root first. */
export type SelectionTarget = Partial<Record<SelectionDimension, string | readonly string[]>>;

const scalar = z.union([z.string(), z.number(), z.boolean()]);
const bound = z.union([z.string(), z.number()]);

const predicateSchema = z
  .union([
    z.object({ field: labelText(), value: scalar }).strict(),
    z
      .object({
        field: labelText(),
        range: z.object({ gte: bound, lt: bound }).strict(),
      })
      .strict(),
  ])
  .describe(
    'What selecting the key means in the host’s data: `{ field, value }` for a term, `{ field, range: { gte, lt } }` for a bucket. The pack never reads `field`.'
  );

export type Predicate = z.infer<typeof predicateSchema>;

export const selectionKeysRule =
  'every key in `selection.on` names a key the chart’s data declares';

const RESERVED = ['target', 'predicates'] as const;
const reservedRule = 'context never sets `target` or `predicates`, which the event fills';

const eventFields = {
  name: labelText().describe(
    'The event name the host handles, agreed between author and host, e.g. `dashboard/select`.'
  ),
  context: z
    .record(z.string(), z.json())
    .describe(
      `Passed through untouched into the event's context, e.g. \`{ "panelId": "p1" }\`. JSON only; ${reservedRule}.`
    )
    .check(
      crossRefine((context) => RESERVED.every((key) => !Object.hasOwn(context, key)), {
        error: reservedRule,
        rule: reservedRule,
      })
    )
    .optional(),
};

/** A chart whose clicks resolve no dimension, such as a KPI: a click anywhere raises the event. */
export const wholeChartSelectionSchema = () =>
  z
    .object(eventFields)
    .strict()
    .describe(
      'Makes the chart selectable as a whole: a click anywhere on it raises an event named `name` with an empty `target` and no predicates.'
    );

/** Every selectable chart's `selection` field, over the dimensions its clicks resolve. */
export const selectionSchema = (
  dimensions: readonly [SelectionDimension, ...SelectionDimension[]]
) =>
  z
    .object({
      ...eventFields,
      on: z
        .object(
          Object.fromEntries(
            dimensions.map((dimension) => [
              dimension,
              z
                .record(labelText(), z.array(predicateSchema).min(1))
                .describe(`Per ${dimension} key, the predicates selecting it means.`)
                .optional(),
            ])
          )
        )
        .strict()
        .describe(
          `Per dimension (${dimensions
            .map((d) => `\`${d}\``)
            .join(
              ', '
            )}), per key: the predicates a selection carries, ANDed. A key left out still raises the event, with no predicates.`
        )
        .optional(),
    })
    .strict()
    .describe(
      `Makes the chart selectable: a click on a mark raises an event named \`name\` whose context holds \`target\` (the keys clicked) and \`predicates\`; ${selectionKeysRule}.`
    );

export type ChartSelection = z.infer<ReturnType<typeof selectionSchema>>;

/** `selection.on` keys the chart's data does not declare, as `dimension.key`. */
export const unknownSelectionKeys = (
  selection: ChartSelection | undefined,
  declared: Partial<Record<SelectionDimension, ReadonlySet<string>>>
): string[] =>
  Object.entries(selection?.on ?? {}).flatMap(([dimension, byKey]) =>
    Object.keys(byKey ?? {})
      .filter((key) => !declared[dimension as SelectionDimension]?.has(key))
      .map((key) => `${dimension}.${key}`)
  );

/** The event a click on `target` raises. */
export const selectionEvent = (
  selection: ChartSelection,
  target: SelectionTarget
): ActionEventRef => {
  const on = (selection.on ?? {}) as Partial<
    Record<SelectionDimension, Record<string, Predicate[]>>
  >;
  const authored = <T>(record: Partial<Record<string, T>> | undefined, key: string) =>
    record && Object.hasOwn(record, key) ? record[key] : undefined;
  const predicates = Object.entries(target).flatMap(([dimension, value]) =>
    (typeof value === 'string' ? [value] : value ?? []).flatMap(
      (key) => authored(authored(on, dimension), key) ?? []
    )
  );
  return {
    name: selection.name,
    context: {
      ...selection.context,
      target,
      predicates,
    },
  };
};
