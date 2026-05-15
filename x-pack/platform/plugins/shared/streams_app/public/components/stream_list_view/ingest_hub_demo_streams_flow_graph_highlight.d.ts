import type { FlowGraphEdgeDef, FlowGraphPoint } from './ingest_hub_demo_streams_flow_graph_model';
export interface FlowHighlightSets {
    readonly nodeIds: ReadonlySet<string>;
    readonly edgeIds: ReadonlySet<string>;
    /**
     * When true, the hovered edge ends at a branch with multiple outgoing edges. The highlight is
     * the union of root→leaf paths for each child (e.g. shared trunk into a fan). The canvas draws
     * those edges individually in the strong color instead of a single merged SVG path.
     */
    readonly multicastBranch?: boolean;
}
/**
 * When hovering an edge, highlight the unique route from the graph root down to that edge's
 * target node (`to`), inclusive. If `to` is a branch with multiple outgoing edges, highlight the
 * union of every root→leaf path through each child (shared trunk + all downstream destinations).
 */
export declare function computeFlowHighlightForHoveredEdge(edges: readonly FlowGraphEdgeDef[], hoveredEdgeId: string | null): FlowHighlightSets | null;
/**
 * Ordered edges root → `targetNodeId`, merged into one waypoint polyline (dedupes repeated
 * points at edge joins). Used to draw a single dashed stroke for the full hovered trace so dots
 * do not stack at hubs.
 */
export declare function mergeWaypointPolylineForPathToNode(edges: readonly FlowGraphEdgeDef[], targetNodeId: string): FlowGraphPoint[];
/** Full trace waypoints for the hovered edge’s downstream path (same scope as {@link computeFlowHighlightForHoveredEdge}). */
export declare function mergeWaypointPolylineForHoveredEdge(edges: readonly FlowGraphEdgeDef[], hoveredEdgeId: string | null): FlowGraphPoint[] | null;
export declare function polylineLength(polyline: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
}>): number;
export declare function pointAlongPolyline(polyline: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
}>, t: number): {
    x: number;
    y: number;
};
export declare function polylineToPathD(polyline: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
}>): string;
/**
 * Orthogonal polyline with rounded corners (quadratic fillets), matching a soft “elbow” flow.
 */
export declare function polylineToRoundedElbowPathD(polyline: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
}>, cornerRadius?: number): string;
/** Connector path: straight two-point edges; rounded elbows for orthogonal polylines (3+ points). */
export declare function polylineToSmoothPathD(polyline: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
}>, cornerRadius?: number): string;
/** Approximate point along connector geometry (linear for 2-point; polyline length for elbows). */
export declare function pointAlongSmoothEdge(polyline: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
}>, t: number): {
    x: number;
    y: number;
};
