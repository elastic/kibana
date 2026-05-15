import type { Dispatch, SetStateAction } from 'react';
import React from 'react';
import type { FlowGraphEdgeDef, FlowGraphNodeDef } from './ingest_hub_demo_streams_flow_graph_model';
export interface FlowPipelineCamera {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
}
export interface IngestHubDemoStreamsFlowPipelineCanvasMinimapProps {
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly viewportWidth: number;
    readonly viewportHeight: number;
    readonly camera: FlowPipelineCamera;
    readonly onCameraChange: Dispatch<SetStateAction<FlowPipelineCamera>>;
    readonly nodes: readonly FlowGraphNodeDef[];
    readonly edges: readonly FlowGraphEdgeDef[];
}
/**
 * Sketch-style canvas minimap (see Sketch docs: overview + viewport, click to jump).
 * Placed bottom-left on the flow pipeline canvas.
 */
export declare function IngestHubDemoStreamsFlowPipelineCanvasMinimap({ worldWidth, worldHeight, viewportWidth, viewportHeight, camera, onCameraChange, nodes, edges, }: IngestHubDemoStreamsFlowPipelineCanvasMinimapProps): React.JSX.Element;
