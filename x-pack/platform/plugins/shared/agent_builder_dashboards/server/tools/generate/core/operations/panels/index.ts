/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  LENS_EMBEDDABLE_TYPE,
  visPanelConfigInputSchema,
  panelRequestSchema,
  editPanelRequestInputSchema,
} from './vis';
import {
  MARKDOWN_EMBEDDABLE_TYPE,
  markdownPanelConfigInputSchema,
  editMarkdownPanelConfigInputSchema,
} from './markdown';

/**
 * Panel registry.
 *
 * Each panel type lives in its own module under `./<type>` and owns its
 * embeddable-type identity, config contract, and input schemas. This barrel is
 * the single place that combines those per-type schemas into the shapes the
 * operations consume — the discriminated unions, the `type` -> embeddable-type
 * map, and the per-operation panel item schemas. Operations import from here and
 * never reach into a specific panel implementation, so adding a panel type means
 * touching its module plus this file.
 */
export { MARKDOWN_EMBEDDABLE_TYPE } from './markdown';
export type { PanelRequestInput, EditPanelRequestInput } from './vis';

/**
 * A `panelConfig` adds a panel from an already-resolved configuration passed by
 * value. It is discriminated by `type`, so each panel type owns its own `config`
 * shape (see the per-type modules). The generation tool never reads an
 * attachment or saved-object store, so the config must be supplied directly
 * rather than as an attachment ID.
 */
export const panelConfigPanelInputSchema = z.discriminatedUnion('type', [
  visPanelConfigInputSchema,
  markdownPanelConfigInputSchema,
]);

export type PanelConfigPanelInput = z.infer<typeof panelConfigPanelInputSchema>;
export type PanelType = PanelConfigPanelInput['type'];

/** Maps a model-facing panel `type` to its embeddable type id (1:1). */
export const PANEL_TYPE_TO_EMBEDDABLE_TYPE: Record<PanelType, string> = {
  vis: LENS_EMBEDDABLE_TYPE,
  markdown: MARKDOWN_EMBEDDABLE_TYPE,
};

const sectionIdField = z
  .string()
  .optional()
  .describe(
    'ID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
  );

/** A single panel item accepted by `add_panels` (any panel type, optionally targeting a section). */
export const addPanelsItemSchema = z.discriminatedUnion('kind', [
  z.discriminatedUnion('type', [
    visPanelConfigInputSchema.extend({ sectionId: sectionIdField }),
    markdownPanelConfigInputSchema.extend({ sectionId: sectionIdField }),
  ]),
  panelRequestSchema.extend({ sectionId: sectionIdField }),
]);

export type AddPanelsItemInput = z.infer<typeof addPanelsItemSchema>;

/** A single inline panel item accepted by `add_section` (section-relative, no sectionId). */
export const addSectionPanelItemSchema = z.discriminatedUnion('kind', [
  panelConfigPanelInputSchema,
  panelRequestSchema,
]);

/** A single panel item accepted by `edit_panels` (targets an existing panel by id). */
export const editPanelItemSchema = z.discriminatedUnion('kind', [
  editPanelRequestInputSchema,
  editMarkdownPanelConfigInputSchema,
]);

export type EditPanelItem = z.infer<typeof editPanelItemSchema>;
