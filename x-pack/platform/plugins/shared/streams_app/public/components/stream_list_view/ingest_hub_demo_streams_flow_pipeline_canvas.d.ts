/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { AwsMockStreamRow } from './ingest_hub_demo_streams_model';
export interface IngestHubDemoStreamsFlowPipelineCanvasProps {
  readonly topology: import('../ingest_hub_demo_stream_topology').IngestHubDemoStreamTopology;
  readonly buildStreamHref: (streamName: string) => string;
  readonly onStreamNavigate: (streamName: string) => void;
  readonly onToggleFullscreen?: () => void;
  readonly isFullscreen?: boolean;
  readonly onOpenCanvasSettings?: () => void;
}
export type IngestHubDemoStreamsFlowPipelineCanvasZoomPreset = 50 | 100 | 200;
export interface IngestHubDemoStreamsFlowPipelineCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomToPreset: (preset: IngestHubDemoStreamsFlowPipelineCanvasZoomPreset) => void;
}
export declare const IngestHubDemoStreamsFlowPipelineCanvas: React.ForwardRefExoticComponent<
  IngestHubDemoStreamsFlowPipelineCanvasProps &
    React.RefAttributes<IngestHubDemoStreamsFlowPipelineCanvasRef>
>;
