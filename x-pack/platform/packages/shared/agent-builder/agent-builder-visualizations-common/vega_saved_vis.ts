/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `savedVis.type` Kibana's legacy-vis embeddable uses to render a Vega/Vega-Lite spec. */
export const VEGA_VIS_TYPE = 'vega';

/**
 * Panel `type` for a Vega panel in the (future) dashboard API / attachment shape.
 * This is the target native `vega` embeddable type; until it ships, a temporary
 * converter maps this to the legacy-vis (`visualization`) embeddable for
 * rendering (see `agent-builder-dashboards-common/converters`).
 */
export const VEGA_PANEL_TYPE = 'vega';

/**
 * The by-value `savedVis` shape a Kibana legacy-vis (`visualization`) embeddable
 * expects for a Vega/Vega-Lite spec. Kept minimal (no persisted saved object) so
 * the same spec can be rendered inline in chat and embedded in a dashboard panel.
 */
export interface VegaSavedVis {
  title: string;
  description: string;
  type: typeof VEGA_VIS_TYPE;
  params: { spec: string };
  uiState: Record<string, unknown>;
  data: { aggs: unknown[]; searchSource: Record<string, unknown> };
}

/**
 * Build the by-value `savedVis` for a Vega/Vega-Lite spec. Shared by the browser
 * inline renderer and the server dashboard-panel converter so both surfaces embed
 * an identical legacy-vis embeddable for the same spec.
 */
export const buildVegaSavedVis = ({
  spec,
  title = '',
  description = '',
}: {
  spec: string;
  title?: string;
  description?: string;
}): VegaSavedVis => ({
  title,
  description,
  type: VEGA_VIS_TYPE,
  params: { spec },
  uiState: {},
  data: { aggs: [], searchSource: {} },
});

/**
 * Read the serialized Vega spec out of a legacy-vis (`visualization`) panel's
 * by-value `config`, i.e. `config.savedVis.params.spec`. Returns `undefined` when
 * the config is not a Vega legacy-vis panel.
 */
export const extractVegaSpecFromSavedVis = (
  config: unknown
): { spec: string; title: string; description: string } | undefined => {
  const savedVis = (config as { savedVis?: unknown } | null | undefined)?.savedVis as
    | { type?: unknown; title?: unknown; description?: unknown; params?: { spec?: unknown } }
    | undefined;
  if (!savedVis || savedVis.type !== VEGA_VIS_TYPE) {
    return undefined;
  }
  const spec = savedVis.params?.spec;
  if (typeof spec !== 'string') {
    return undefined;
  }
  return {
    spec,
    title: typeof savedVis.title === 'string' ? savedVis.title : '',
    description: typeof savedVis.description === 'string' ? savedVis.description : '',
  };
};
