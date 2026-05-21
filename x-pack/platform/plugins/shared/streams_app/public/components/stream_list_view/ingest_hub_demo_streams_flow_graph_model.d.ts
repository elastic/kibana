import type { IngestHubDemoStreamTopology } from '../ingest_hub_demo_stream_topology';
export interface FlowGraphPoint {
    readonly x: number;
    readonly y: number;
}
export type FlowGraphNodeKind = 'source' | 'processing' | 'routing' | 'branch' | 'stream';
export interface FlowGraphNodeDef {
    readonly id: string;
    readonly kind: FlowGraphNodeKind;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly flowIndex: number;
}
export interface FlowGraphEdgeDef {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    readonly polyline: ReadonlyArray<FlowGraphPoint>;
}
export declare const INGEST_HUB_DEMO_STREAMS_FLOW_LAYOUT_HEIGHT = 400;
export declare const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX = 250;
export declare const INGEST_HUB_DEMO_STREAMS_FLOW_MIN_LAYOUT_WIDTH_PX: number;
export declare function getTopologySourceNodeId(flowIndex: number): string;
export declare function getTopologyDestNodeId(flowIndex: number): string;
export declare function getTopologyProcessingNodeId(flowIndex: number, stepId: string): string;
export declare function getTopologyRoutingNodeId(flowIndex: number): string;
export declare function parseTopologyFlowNodeIndex(nodeId: string): number | null;
export interface IngestHubDemoStreamsFlowLayout {
    readonly layoutWidth: number;
    readonly layoutHeight: number;
    readonly nodes: readonly FlowGraphNodeDef[];
    readonly edges: readonly FlowGraphEdgeDef[];
    readonly flowCount: number;
}
export declare function buildStreamTopologyFlowLayout(contentWidth: number, topology: IngestHubDemoStreamTopology): IngestHubDemoStreamsFlowLayout;
