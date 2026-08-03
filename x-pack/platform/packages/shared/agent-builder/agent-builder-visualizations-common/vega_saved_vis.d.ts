/**
 * The `vega` type string — both the `savedVis.type` Kibana's legacy-vis
 * embeddable renders and the panel `type` for a Vega panel in the (future)
 * dashboard API / attachment shape. Until the native vega embeddable API ships,
 * a temporary converter maps the attachment shape to the legacy-vis embeddable
 * (see `agent-builder-dashboards-common/converters`).
 */
export declare const VEGA_VIS_TYPE = "vega";
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
    params: {
        spec: string;
    };
    uiState: Record<string, unknown>;
    data: {
        aggs: unknown[];
        searchSource: Record<string, unknown>;
    };
}
/**
 * Build the by-value `savedVis` for a Vega/Vega-Lite spec. Shared by the browser
 * inline renderer and the server dashboard-panel converter so both surfaces embed
 * an identical legacy-vis embeddable for the same spec.
 */
export declare const buildVegaSavedVis: ({ spec, title, description, }: VegaConfig) => VegaSavedVis;
/**
 * Read a {@link VegaConfig} out of an untyped attachment payload (e.g. the
 * standalone visualization attachment's `visualization` record). Returns
 * `undefined` when there is no usable spec, so callers can guard rendering.
 */
export declare const normalizeVegaConfig: (input: unknown) => VegaConfig | undefined;
export declare const prettyPrintVegaSpec: (spec: string) => string;
/**
 * Read the serialized Vega spec out of a legacy-vis (`visualization`) panel's
 * by-value `config`, i.e. `config.savedVis.params.spec`. Returns `undefined` when
 * the config is not a Vega legacy-vis panel.
 */
export declare const extractVegaSpecFromSavedVis: (config: unknown) => {
    spec: string;
    title: string;
    description: string;
} | undefined;
