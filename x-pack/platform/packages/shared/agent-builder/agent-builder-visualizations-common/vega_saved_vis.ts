/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `vega` type string — both the `savedVis.type` Kibana's legacy-vis
 * embeddable renders and the panel `type` for a Vega panel in the (future)
 * dashboard API / attachment shape. Until the native vega embeddable API ships,
 * a temporary converter maps the attachment shape to the legacy-vis embeddable
 * (see `agent-builder-dashboards-common/converters`).
 */
export const VEGA_VIS_TYPE = 'vega';

/**
 * Canonical Vega config carried by Agent Builder attachments. This is the
 * shared "future native Vega API" payload used by both surfaces — the standalone
 * visualization attachment (`visualization`) and the dashboard Vega panel
 * (`config`) — so a single {@link buildVegaSavedVis} transform can render either.
 */
export interface VegaConfig {
  /** The serialized Vega/Vega-Lite spec. */
  spec: string;
  title?: string;
  description?: string;
}

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
}: VegaConfig): VegaSavedVis => ({
  title,
  description,
  type: VEGA_VIS_TYPE,
  params: { spec },
  uiState: {},
  data: { aggs: [], searchSource: {} },
});

/**
 * Read a {@link VegaConfig} out of an untyped attachment payload (e.g. the
 * standalone visualization attachment's `visualization` record). Returns
 * `undefined` when there is no usable spec, so callers can guard rendering.
 */
export const normalizeVegaConfig = (input: unknown): VegaConfig | undefined => {
  const record = input as
    | { spec?: unknown; title?: unknown; description?: unknown }
    | null
    | undefined;
  const spec = record?.spec;
  if (typeof spec !== 'string' || spec.length === 0) {
    return undefined;
  }
  const config: VegaConfig = { spec };
  if (typeof record?.title === 'string') {
    config.title = record.title;
  }
  if (typeof record?.description === 'string') {
    config.description = record.description;
  }
  return config;
};

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
