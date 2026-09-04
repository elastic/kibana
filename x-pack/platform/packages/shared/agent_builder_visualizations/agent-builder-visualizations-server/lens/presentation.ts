/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get, has, isEqual, unset } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { z } from '@kbn/zod/v4';

const valueSchema = z.union([
  z.string().max(1024),
  z.boolean(),
  z.number().finite(),
  z.array(z.string().max(64)).max(20),
]);
/** Panel-level fields that every visualization panel, including Vega, may change. */
const chromePaths = ['title', 'description', 'hide_title'] as const;
const pathSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z_]\w*(?:\.(?:[a-zA-Z_]\w*|0|[1-9]\d*))*$/, 'Use a dot-separated field path.')
  .refine(
    (path) =>
      !path.split('.').some((part) => ['__proto__', 'prototype', 'constructor'].includes(part)),
    'Unsafe object path.'
  );

export const lensPresentationEditSchema = z.strictObject({
  changes: z
    .array(
      z.discriminatedUnion('operation', [
        z.strictObject({
          operation: z.literal('set'),
          path: pathSchema,
          value: valueSchema,
        }),
        z.strictObject({ operation: z.literal('remove'), path: pathSchema }),
      ])
    )
    .min(1)
    .max(100)
    .describe(
      'Presentation changes: { operation: "set", path, value } or { operation: "remove", path }. Paths are dot-separated Lens API fields with existing array indices, e.g. legend.visibility or layers.0.y.0.color.'
    ),
});

type PresentationEdit = z.infer<typeof lensPresentationEditSchema>;

/** Applies edits atomically without changing unmentioned settings. */
export const editLensPresentation = <T extends object>(
  config: T,
  edit: PresentationEdit,
  chromeOnly = false
): T => {
  const parsedEdit = lensPresentationEditSchema.parse(edit);
  const result = cloneDeep(config);
  for (const change of parsedEdit.changes) {
    if (chromeOnly && !chromePaths.some((path) => path === change.path)) {
      throw new Error(
        `Unsupported presentation path "${change.path}". Data and chart-family edits require source: "request".`
      );
    }
    const path = change.path.split('.');
    // Do not allocate sparse arrays or let a path change an array's length.
    for (let index = 1; index < path.length; index++) {
      const parent = get(result, path.slice(0, index));
      const part = path[index];
      const isIndex = /^(0|[1-9]\d*)$/.test(part);
      if (
        (isIndex || Array.isArray(parent)) &&
        !(isIndex && Array.isArray(parent) && Object.hasOwn(parent, part))
      ) {
        throw new Error(`Path "${change.path}" must use an existing array index.`);
      }
    }
    if (change.operation === 'remove') {
      if (has(result, path)) unset(result, path);
    } else {
      set(result, path, change.value);
    }
  }

  for (const path of chromePaths) {
    const value = get(result, path);
    if (value !== undefined && typeof value !== (path === 'hide_title' ? 'boolean' : 'string')) {
      throw new Error(`Invalid panel ${path}.`);
    }
  }
  if (!chromeOnly) {
    // Validate, but do not persist the parsed object: parsing drops wrapper fields and adds defaults.
    const validation = lensApiConfigSchema.safeParse(result);
    if (!validation.success) {
      throw new Error(
        'Presentation edit would produce an invalid Lens API configuration. Check the supported settings and the existing chart; this panel was left unchanged.'
      );
    }
    const validated = validation.data;
    for (const change of parsedEdit.changes) {
      const path = change.path.split('.');
      if (
        change.operation === 'set' &&
        change.path !== 'hide_title' &&
        !isEqual(get(result, path), get(validated, path))
      ) {
        throw new Error(`Lens does not support the value at "${change.path}".`);
      }
    }
  }
  return result;
};

/** How to express `edit_panels` presentation changes; what to change is defined by the chart style rules. */
export const getLensPresentationEditGuidance = (): string =>
  [
    'PRESENTATION EDITS (edit_panels with source: "config", type: "vis", config.changes):',
    '- Each change is { operation: "set", path, value } or { operation: "remove", path }. Paths are dot-separated Lens API fields with existing array indices, e.g. title, hide_title, legend.visibility, axis.x.title.visible, layers.0.y.0.color — never internal visualization.* state.',
    '- Values are scalars or a list of legend statistics. Edit objects field by field, e.g. layers.0.y.0.format.type and layers.0.y.0.format.decimals.',
    '- Unmentioned settings stay unchanged. Remove a setting to restore the Lens default; to drop chart coloring, remove both color and apply_color_to.',
    '- Presentation only: queries, data sources, filters, aggregations, column bindings, chart families, and layer membership stay as they are. The only exceptions are those the chart style rules call for: removing optional gauge metric.min, metric.max, and an unrequested metric.goal, and setting a time-series layers.<index>.type to "area".',
    `- Vega panels accept only ${chromePaths.join(', ')}.`,
    '- Each panel is validated against the Lens schema and applied atomically; a failed panel is left unchanged. Report failures instead of claiming they were fixed.',
  ].join('\n');
