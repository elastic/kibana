import React from 'react';
import type { AwsMockStreamRow } from './ingest_hub_demo_streams_model';
export interface IngestHubDemoStreamsFlowPipelineCanvasProps {
    readonly visibleRoot: AwsMockStreamRow | undefined;
    readonly visibleLeaves: readonly AwsMockStreamRow[];
    readonly buildStreamHref: (streamName: string) => string;
    readonly onStreamNavigate: (streamName: string) => void;
    readonly onCameraZoomChange?: (zoom: number) => void;
}
export type IngestHubDemoStreamsFlowPipelineCanvasZoomPreset = 50 | 100 | 200;
export interface IngestHubDemoStreamsFlowPipelineCanvasRef {
    zoomIn: () => void;
    zoomOut: () => void;
    zoomToFit: () => void;
    zoomToPreset: (preset: IngestHubDemoStreamsFlowPipelineCanvasZoomPreset) => void;
}
export declare const IngestHubDemoStreamsFlowPipelineCanvas: React.ForwardRefExoticComponent<IngestHubDemoStreamsFlowPipelineCanvasProps & React.RefAttributes<IngestHubDemoStreamsFlowPipelineCanvasRef>>;
