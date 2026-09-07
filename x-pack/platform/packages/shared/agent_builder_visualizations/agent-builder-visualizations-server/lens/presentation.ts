/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get, has, unset } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { z } from '@kbn/zod/v4';

const valueSchema = z.union([
  z.string().max(1024),
  z.boolean(),
  z.number().finite(),
  z.array(z.string().max(64)).max(20),
]);
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

type PresentationChange = z.infer<typeof lensPresentationEditSchema>['changes'][number];

/** Dashboard panel fields that live next to the chart config and are not part of the Lens schema. */
const PANEL_FIELD_TYPES = {
  title: 'string',
  description: 'string',
  hide_title: 'boolean',
} as const;
const PANEL_FIELDS = Object.keys(PANEL_FIELD_TYPES);
const isPanelField = (path: string): boolean => PANEL_FIELDS.includes(path);

/** `set` may create missing objects, but must never create, extend, or reshape an array. */
const assertNoArrayGrowth = (target: object, segments: string[], path: string): void => {
  for (let index = 1; index < segments.length; index++) {
    const parent = get(target, segments.slice(0, index));
    const segment = segments[index];
    const isIndex = /^\d+$/.test(segment);
    const allowed = Array.isArray(parent) ? isIndex && Number(segment) < parent.length : !isIndex;
    if (!allowed) {
      throw new Error(`Path "${path}" must use an existing array index.`);
    }
  }
};

const applyChanges = <T extends object>(config: T, changes: PresentationChange[]): T => {
  const result = cloneDeep(config);
  for (const change of changes) {
    const segments = change.path.split('.');
    assertNoArrayGrowth(result, segments, change.path);
    if (change.operation === 'set') {
      set(result, segments, change.value);
    } else if (has(result, segments)) {
      unset(result, segments);
    }
  }
  return result;
};

const assertPanelFieldTypes = (config: object): void => {
  for (const [field, type] of Object.entries(PANEL_FIELD_TYPES)) {
    const value = get(config, field);
    if (value !== undefined && typeof value !== type) {
      throw new Error(`Invalid panel ${field}.`);
    }
  }
};

/**
 * Validates with the Lens schema without persisting its output, which drops panel fields and fills
 * defaults. Because the schema strips unknown fields instead of rejecting them, every set field
 * must also still be present after parsing.
 */
const assertLensAccepts = (config: object, changes: PresentationChange[]): void => {
  const validation = lensApiConfigSchema.safeParse(config);
  if (!validation.success) {
    throw new Error(
      'Presentation edit would produce an invalid Lens API configuration. Check the supported settings and the existing chart; this panel was left unchanged.'
    );
  }
  for (const { operation, path } of changes) {
    if (operation === 'set' && !isPanelField(path) && !has(validation.data, path)) {
      throw new Error(`Lens ignores "${path}"; it is not a setting of this chart.`);
    }
  }
};

/** Applies presentation edits to a Lens API config atomically; unmentioned settings stay unchanged. */
export const editLensPresentation = <T extends object>(config: T, edit: unknown): T => {
  const { changes } = lensPresentationEditSchema.parse(edit);
  const result = applyChanges(config, changes);
  assertPanelFieldTypes(result);
  assertLensAccepts(result, changes);
  return result;
};

/** Vega panels only expose their panel fields; the spec itself is edited through `source: "request"`. */
export const editVegaPresentation = <T extends object>(config: T, edit: unknown): T => {
  const { changes } = lensPresentationEditSchema.parse(edit);
  for (const { path } of changes) {
    if (!isPanelField(path)) {
      throw new Error(
        `Unsupported presentation path "${path}". Vega panels accept only ${PANEL_FIELDS.join(
          ', '
        )}; spec changes require source: "request".`
      );
    }
  }
  const result = applyChanges(config, changes);
  assertPanelFieldTypes(result);
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
    `- Vega panels accept only ${PANEL_FIELDS.join(', ')}.`,
    '- Each panel is validated against the Lens schema and applied atomically; a failed panel is left unchanged. Report failures instead of claiming they were fixed.',
  ].join('\n');
