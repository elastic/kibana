/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { actionsSchema, MAX_HEADING_LENGTH } from '@kbn/custom-app-common';

/** The most a panel's state may take as text. It is the size of a large dashboard panel. */
export const MAX_EMBEDDABLE_STATE_LENGTH = 50_000;
export const MIN_EMBEDDABLE_HEIGHT = 120;
export const MAX_EMBEDDABLE_HEIGHT = 1_200;
export const DEFAULT_EMBEDDABLE_HEIGHT = 320;

export const embeddableCapability = defineCapability({
  kind: 'component',
  id: 'embeddable',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('A heading above the panel. It may use {{state.key}}.'),
      embeddableType: z
        .string()
        .regex(/^[A-Za-z0-9_.-]+$/)
        .min(1)
        .max(100)
        .describe(
          'The type of the panel, as a dashboard knows it, for example "vis" (a Lens visualization), "map", "discover_session" or "markdown".'
        ),
      state: z
        .record(z.string().max(200), z.unknown())
        .refine((state) => JSON.stringify(state).length <= MAX_EMBEDDABLE_STATE_LENGTH, {
          message: `The state of a panel may take at most ${MAX_EMBEDDABLE_STATE_LENGTH} characters`,
        })
        .describe(
          'The state of the panel, as it is saved on a dashboard: the "config" of that panel in the dashboards API. It follows the schema of that type of panel.'
        ),
      onClick: actionsSchema
        .default([])
        .describe(
          'The actions to run when something in the panel is clicked, with the row behind it: a bar, a point or a slice of a Lens chart. They can set a value of the app from a column of the row, as a table row click does. Only Lens charts (type "vis") send a click for now.'
        ),
      height: z
        .number()
        .int()
        .min(MIN_EMBEDDABLE_HEIGHT)
        .max(MAX_EMBEDDABLE_HEIGHT)
        .optional()
        .describe(`How tall the panel is, in pixels. ${DEFAULT_EMBEDDABLE_HEIGHT} when left out.`),
    })
  ),
  doc: {
    summary:
      'any panel that a dashboard can hold, drawn as it is on a dashboard, for what has no component of its own: a map, a Lens visualization, an SLO. "embeddableType" says which panel and "state" is its config, the same as in the dashboards API. The panel takes the time range and filters of the app, and fetches its own data. To use one, copy the config of that panel from a dashboard; do not make a state up. Prefer the native components (stat, table, chart) when they are enough.',
    whenToUse:
      'For a panel that has no component of its own, with a state that you have, such as one copied from a dashboard.',
    example: {
      type: 'embeddable',
      id: 'notes',
      title: 'Notes',
      embeddableType: 'markdown',
      state: { content: '# Runbook\nCheck the dashboards first.' },
    },
  },
  interpolated: ['title'],
  events: { onChartClick: 'onClick' },
  data: 'own',
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    embeddable: CapabilityNodeOf<typeof embeddableCapability>;
  }
}

/** What an embeddable component of an app holds. */
export type EmbeddableNode = CapabilityNodeOf<typeof embeddableCapability>;
