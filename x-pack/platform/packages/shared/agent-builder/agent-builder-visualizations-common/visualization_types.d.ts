/**
 * Which engine renders a generated visualization. Lens is the default for
 * standard charts; Vega is used for requests Lens cannot express.
 */
export type VisualizationRenderer = 'lens' | 'vega';
export interface VisualizationAttachmentData {
    /** Renderer discriminator. Omitted defaults to Lens for legacy attachments. */
    renderer?: VisualizationRenderer;
    /** The display query */
    query: string;
    /** Visualization configuration payload. For Vega, includes a serialized spec. */
    visualization: Record<string, unknown> & {
        spec?: string;
    };
    /** Optional chart type identifier (primarily used by Lens). */
    chart_type?: string;
    /** The ES|QL query backing the visualization. */
    esql: string;
    /** Optional time range for the visualization (e.g., { from: 'now-24h', to: 'now' }) */
    time_range?: {
        from: string;
        to: string;
    };
}
