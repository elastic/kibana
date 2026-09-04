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
      'Explicit presentation changes chosen by the agent. Use dot-separated Lens API paths, with existing array indices. Never replace arrays, data sources, or chart families. Follow the shared chart guidance for line-to-area restyling and optional gauge binding removals.'
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

/** Describes explicit edits and the agent's responsibility to preserve chart semantics. */
export const getLensPresentationEditGuidance = (): string =>
  [
    'PRESENTATION EDITS:',
    'Emit only explicit changes: { operation: "set", path, value } or { operation: "remove", path }. Unmentioned settings remain unchanged. Use dot-separated Lens API fields with existing array indices, not internal visualization.* state. Set accepts scalars or a list of legend statistics, not objects. Edit object settings through individual fields, e.g. layers.0.y.0.format.type and layers.0.y.0.format.decimals. Remove a setting explicitly to restore the native Lens default. When removing metric/table coloring, explicitly remove apply_color_to as well as color.',
    'To remove a panel title, explicitly clear title or set hide_title: true; for metrics, always clear title. When changing XY legend placement, remove incompatible legend.layout and legend.columns settings explicitly. Apply the line-to-area guidance by setting the existing layers.<index>.type to "area" and styling.areas.fill to "gradient".',
    'Only change presentation. Never modify queries, data sources, filters, aggregations, chart families, or layer membership during Prettify. Preserve panel identity, units, and column bindings, except for removing optional gauge metric.min, metric.max, and unrequested metric.goal as required by the gauge rules. Line-to-area restyling must keep the layer data and bindings unchanged. Do not regenerate a chart for styling; query and chart-family changes require a separate user request.',
    `Vega supports only ${chromePaths.join(', ')} changes; leave its spec unchanged.`,
    'Lens validates the resulting configuration. If an edit fails validation, report the panel failure rather than claiming it was fixed.',
  ].join('\n');
