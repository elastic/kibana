/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `savedVis.type` of a Vega visualization that Kibana's legacy-vis embeddable renders. A Vega
 * dashboard panel's `type` is `VEGA_EMBEDDABLE_TYPE` from `@kbn/vega-constants`.
 */
export const VEGA_VIS_TYPE = 'vega';

/** Vega config carried by the standalone visualization attachment (`visualization`). */
export interface VegaConfig {
  /** The serialized Vega/Vega-Lite spec. */
  spec: string;
  title?: string;
  description?: string;
}

/**
 * The by-value `savedVis` shape a Kibana legacy-vis (`visualization`) embeddable
 * expects for a Vega/Vega-Lite spec. Kept minimal (no persisted saved object) so
 * the spec can be rendered inline in chat.
 */
interface VegaSavedVis {
  title: string;
  description: string;
  type: typeof VEGA_VIS_TYPE;
  params: { spec: string };
  uiState: Record<string, unknown>;
  data: { aggs: unknown[]; searchSource: Record<string, unknown> };
}

/** Build the by-value `savedVis` the inline chat renderer embeds for a Vega/Vega-Lite spec. */
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

/** The longest spec a native `vega` panel accepts. */
const MAX_NATIVE_VEGA_SPEC_LENGTH = 1_000_000;

/**
 * Read the serialized Vega spec out of a legacy-vis (`visualization`) panel's
 * by-value `config`, i.e. `config.savedVis.params.spec`. Returns `undefined` when
 * the config is not a Vega legacy-vis panel, or its spec does not fit a native `vega` panel.
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
  if (typeof spec !== 'string' || spec.length === 0 || spec.length > MAX_NATIVE_VEGA_SPEC_LENGTH) {
    return undefined;
  }
  return {
    spec,
    title: typeof savedVis.title === 'string' ? savedVis.title : '',
    description: typeof savedVis.description === 'string' ? savedVis.description : '',
  };
};
