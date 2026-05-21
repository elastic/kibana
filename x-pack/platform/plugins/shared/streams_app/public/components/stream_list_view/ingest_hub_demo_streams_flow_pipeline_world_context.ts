/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { IngestHubDemoStreamTopology } from '../ingest_hub_demo_stream_topology';
import type { IngestHubDemoStreamsFlowLayout } from './ingest_hub_demo_streams_flow_graph_model';
import type { FlowHighlightSets } from './ingest_hub_demo_streams_flow_graph_highlight';
import type { FlowCanvasCardSelection } from './ingest_hub_demo_streams_flow_card_selection';

export interface StreamsPipelineWorldContextValue {
  readonly euiTheme: ReturnType<typeof import('@elastic/eui').useEuiTheme>['euiTheme'];
  readonly flowLayout: IngestHubDemoStreamsFlowLayout;
  readonly topology: IngestHubDemoStreamTopology;
  readonly highlight: FlowHighlightSets | null;
  readonly mergedTracePathD: string | null;
  readonly buildStreamHref: (streamName: string) => string;
  readonly onStreamNavigate: (streamName: string) => void;
  readonly onCardSelect: (selection: FlowCanvasCardSelection) => void;
  readonly onEdgeHitEnter: (edgeId: string) => void;
  readonly scheduleHoverClear: () => void;
  readonly clearHoverOnCardEnter: () => void;
  readonly nodeDimmed: (nodeId: string) => boolean;
  readonly connectorPathHoveredClassName: string | undefined;
}

export const StreamsPipelineWorldContext = createContext<StreamsPipelineWorldContextValue | null>(
  null
);
