/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlowGraphNodeKind } from './ingest_hub_demo_streams_flow_graph_model';

export type FlowCanvasCardSelectionKind = FlowGraphNodeKind;

export interface FlowCanvasCardSelection {
  readonly kind: FlowCanvasCardSelectionKind;
  readonly flowIndex: number;
  readonly nodeId: string;
  /** Set for `processing` nodes — id from topology processingSteps. */
  readonly processingStepId?: string;
}

export function buildFlowCanvasCardSelection(
  kind: FlowGraphNodeKind,
  flowIndex: number,
  nodeId: string,
  processingStepId?: string
): FlowCanvasCardSelection {
  return {
    kind,
    flowIndex,
    nodeId,
    ...(processingStepId !== undefined ? { processingStepId } : {}),
  };
}
