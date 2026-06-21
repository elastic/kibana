/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { AttachmentPanel } from '../types';

/**
 * TEMPORARY: Vega attachment panels are stored in the forthcoming Vega
 * embeddable API shape (`type: 'vega'`, `config: { title?, description?, spec }`),
 * but the dashboard renderer does not yet support that embeddable type. Until it
 * does, this converter maps a Vega attachment panel onto the existing by-value
 * legacy visualize embeddable (`legacy_vis` with `savedVis.type: 'vega'`) so the
 * panel renders today.
 *
 * Remove this whole file (and its call site in `from_attachment`) once the
 * dashboard REST API / renderer supports the dedicated `vega` embeddable type.
 */

/** Attachment panel type for a Vega panel (dedicated Vega embeddable API). */
export const VEGA_PANEL_TYPE = 'vega';

/**
 * Embeddable type of the legacy visualize panel we render Vega as for now.
 * Mirrors `VISUALIZE_EMBEDDABLE_TYPE` from `@kbn/visualizations-common`; inlined
 * to avoid coupling this throwaway converter to the visualizations package.
 */
const LEGACY_VIS_EMBEDDABLE_TYPE = 'legacy_vis';

/** `savedVis.type` of a Vega visualization inside the legacy visualize embeddable. */
const VEGA_VIS_TYPE = 'vega';

interface VegaAttachmentPanelConfig {
  title?: string;
  description?: string;
  spec?: unknown;
}

/** Whether an attachment panel is a (new-shape) Vega panel. */
export const isVegaAttachmentPanel = (panel: AttachmentPanel): boolean =>
  panel.type === VEGA_PANEL_TYPE;

/**
 * Convert a Vega attachment panel into a by-value legacy visualize dashboard
 * panel so it renders with the existing Vega renderer.
 */
export const convertVegaPanelToLegacyVisPanel = ({
  id,
  grid,
  config,
}: AttachmentPanel): DashboardPanel => {
  const { title, description, spec } = config as VegaAttachmentPanelConfig;

  return {
    type: LEGACY_VIS_EMBEDDABLE_TYPE,
    id,
    grid,
    config: {
      savedVis: {
        title: title ?? '',
        ...(description !== undefined ? { description } : {}),
        type: VEGA_VIS_TYPE,
        params: { spec: typeof spec === 'string' ? spec : JSON.stringify(spec ?? {}, null, 2) },
        uiState: {},
        data: { aggs: [], searchSource: {} },
      },
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  };
};
