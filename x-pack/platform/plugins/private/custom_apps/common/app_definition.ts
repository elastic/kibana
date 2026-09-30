/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { A2uiMessage } from '@kbn/a2ui-renderer';

/**
 * Grid geometry, mirroring `GridLayoutData` from `@kbn/grid-layout` so a layout
 * round-trips through the saved object untouched. It is stored beside the A2UI
 * content rather than inside it: dragging a panel must never rewrite
 * agent-generated JSON, and the agent never has to reason about geometry.
 */
const gridPanelSchema = z.object({
  id: z.string(),
  row: z.number().int().min(0),
  column: z.number().int().min(0),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
});

const layoutWidgetSchema = z.discriminatedUnion('type', [
  gridPanelSchema.extend({ type: z.literal('panel') }),
  z.object({
    type: z.literal('section'),
    id: z.string(),
    row: z.number().int().min(0),
    title: z.string(),
    isCollapsed: z.boolean(),
    panels: z.record(z.string(), gridPanelSchema),
  }),
]);

/**
 * A2UI messages are validated structurally here — that at least one of the four
 * known message keys is present — and against the component catalog separately.
 * Keeping the two apart means a catalog change does not require a saved object
 * migration.
 */
const MESSAGE_KEYS = [
  'createSurface',
  'updateComponents',
  'updateDataModel',
  'deleteSurface',
] as const;

const a2uiMessageSchema = z.custom<A2uiMessage>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    MESSAGE_KEYS.some((key) => key in (value as object)),
  { message: `Not an A2UI message: expected one of ${MESSAGE_KEYS.join(', ')}` }
);

/**
 * An ES|QL query whose results are written into a surface's data model before
 * it renders, so components bind to live data with the same `{"path": ...}`
 * syntax they use for static values.
 *
 * Queries are a sibling of `surfaces` rather than an A2UI message because the
 * protocol has no notion of a data source — the agent describes *what* to show
 * and *where the data comes from*, and the renderer joins them.
 */
export const esqlQuerySchema = z.object({
  query: z.string().min(1),
  path: z.string().startsWith('/'),
  shape: z.enum(['rows', 'groups', 'first', 'value']).optional().default('rows'),
  /**
   * Required when shape is 'groups': the column to nest rows by. The result is
   * `[{ key, count, items }]`, which a ChildList template renders as one card
   * per group.
   */
  groupBy: z.string().optional(),
  /**
   * ES|QL named parameters, as `paramName -> data model pointer`. A query using
   * `?clusters` with `params: { clusters: '/filters/clusters' }` re-runs whenever
   * that pointer changes, which is how a control in one panel filters another.
   */
  params: z
    .record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/), z.string().startsWith('/').max(512))
    .optional(),
});

export type EsqlQuery = z.infer<typeof esqlQuerySchema>;

export const customAppDefinitionSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1),
  description: z.string().optional(),
  /** Adds this app to the left navigation menu as a link under Custom apps. */
  showInNav: z.boolean().optional(),
  layout: z.record(z.string(), layoutWidgetSchema),
  panels: z.record(
    z.string(),
    z.object({
      title: z.string().optional(),
      /** Drop the panel frame so prose and controls read as page content. */
      hideBorder: z.boolean().optional(),
      /**
       * Groups panels into top-level tabs. Panels with no tab are always
       * visible, which is what makes a header or filter panel persistent.
       */
      tab: z.string().optional(),
    })
  ),
  surfaces: z.record(z.string(), z.array(a2uiMessageSchema)),
  queries: z.record(z.string(), z.array(esqlQuerySchema)).optional(),
});

export type CustomAppDefinition = z.infer<typeof customAppDefinitionSchema>;
export type CustomAppLayout = CustomAppDefinition['layout'];

export interface CustomAppListItem {
  id: string;
  title: string;
  description?: string;
  updatedAt?: string;
  showInNav?: boolean;
}

/**
 * Panels nested in a collapsible section live under `layout[sectionId].panels`
 * rather than at the top level, so anything that needs "every panel" has to
 * walk both.
 */
export function getPanelIds(layout: CustomAppLayout): string[] {
  const ids: string[] = [];
  for (const widget of Object.values(layout)) {
    if (widget.type === 'panel') ids.push(widget.id);
    else ids.push(...Object.keys(widget.panels));
  }
  return ids;
}

export function emptyAppDefinition(title: string): CustomAppDefinition {
  return { version: 1, title, layout: {}, panels: {}, surfaces: {} };
}
