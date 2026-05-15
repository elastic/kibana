/** Point in canvas coordinates (same space as node boxes). */
export interface FlowGraphPoint {
    readonly x: number;
    readonly y: number;
}
export type FlowGraphNodeKind = 'source' | 'branch' | 'stream';
export interface FlowGraphNodeDef {
    readonly id: string;
    readonly kind: FlowGraphNodeKind;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}
export interface FlowGraphEdgeDef {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    /** Polyline waypoints in layout space (2-point straight; 3+ orthogonal with rounded render). */
    readonly polyline: ReadonlyArray<FlowGraphPoint>;
}
export declare const INGEST_HUB_DEMO_STREAMS_FLOW_LAYOUT_HEIGHT = 400;
/** Fixed width for every flow canvas card (source, mid stream, destinations). */
export declare const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX = 250;
/** Minimum `contentWidth` passed to `buildIngestHubDemoStreamsFlowLayout` (full graph width at scale 1). */
export declare const INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX: number;
export interface IngestHubDemoStreamsFlowLayout {
    readonly layoutWidth: number;
    readonly layoutHeight: number;
    readonly nodes: readonly FlowGraphNodeDef[];
    readonly edges: readonly FlowGraphEdgeDef[];
}
/**
 * Builds node positions and edge polylines for a given content width.
 * The spine uses straight segments. The fan uses an invisible `fan_hub` branch so the horizontal
 * bus from `dest_top` is a single edge (no triple-stacked dot strokes); each destination is one
 * orthogonal leg from the hub.
 * `contentWidth` should be the usable width inside the parent’s padding only (e.g. the ingest
 * canvas shell): the source’s left edge is at x = 0 and the right column’s right edge is at
 * layoutWidth. Four equal gaps distribute space between the source, mid stream slot, join slot,
 * and the right-hand destination column.
 */
export declare function buildIngestHubDemoStreamsFlowLayout(contentWidth: number): IngestHubDemoStreamsFlowLayout;
