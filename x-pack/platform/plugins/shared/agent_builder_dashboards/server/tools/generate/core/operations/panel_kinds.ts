/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LENS_EMBEDDABLE_TYPE, visPanelConfigInputSchema } from './panels/vis';
import { MARKDOWN_EMBEDDABLE_TYPE, markdownPanelConfigInputSchema } from './panels/markdown';

/**
 * Composes the per-type panel schemas owned by `./panels/*` into the shared
 * `panelConfig` union and the `type` -> embeddable-type registry.
 *
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
