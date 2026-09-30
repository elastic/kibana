/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericIcon } from '../helpers/style_choices';
import type { WorkspaceField, AdvancedSettings } from './app_state';

export interface WorkspaceNode {
  id: string;
  x: number;
  y: number;
  label: string;
  icon: GenericIcon;
  data: {
    field: string;
    term: string;
  };
  scaledSize: number;
  parent: WorkspaceNode | null;
  color: string;
  numChildren: number;
  kx: number;
  ky: number;
}

export type BlockListedNode = Omit<WorkspaceNode, 'numChildren' | 'kx' | 'ky' | 'id'>;

export interface WorkspaceEdge {
  id?: string;
  weight: number;
  width: number;
  doc_count?: number;
  label: string;
  source: WorkspaceNode;
  target: WorkspaceNode;
  topTarget: WorkspaceNode;
  topSrc: WorkspaceNode;
}

export interface ServerResultNode {
  field: string;
  term: string;
  id: string;
  label: string;
  color: string;
  icon: GenericIcon;
  data: {
    field: string;
    term: string;
  };
}

export interface ServerResultEdge {
  source: number;
  target: number;
  weight: number;
  width: number;
  doc_count?: number;
}

export interface IncomingGraphNode {
  field: string;
  term: string;
  id?: string;
  label?: string;
  color?: string;
  icon?: GenericIcon;
  data?: { field: string; term: string };
}

export interface GraphData {
  nodes: IncomingGraphNode[];
  edges: ServerResultEdge[];
}
export interface TermIntersect {
  id1: string;
  id2: string;
  term1: string;
  term2: string;
  v1: number;
  v2: number;
  overlap: number;
}

export interface Workspace {
  options: WorkspaceOptions;
  nodesMap: Record<string, WorkspaceNode>;
  edgesMap: Record<string, WorkspaceEdge>;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  blocklistedNodes: BlockListedNode[];
  deleteNodes: (nodeIds: string[]) => void;
  blocklistNodes: (nodeIds: string[]) => void;
  groupNodes: (parentId: string, nodeIds: string[]) => void;
  ungroup: (node: WorkspaceNode | undefined) => void;
  mergeIds: (term1: string, term2: string) => void;
  changeHandler: () => void;
  unblockNode: (node: BlockListedNode) => void;
  unblockAll: () => void;
  clearGraph: () => void;

  /**
   * Flatten grouped nodes and return a flat array of nodes
   * @param nodes List of nodes probably containing grouped nodes
   */
  returnUnpackedGroupeds(nodes: WorkspaceNode[]): WorkspaceNode[];

  /**
   * Adds new nodes retrieved from an elasticsearch search
   * @param newData
   */
  mergeGraph(newData: GraphData): void;

  runLayout(): void;
  stopLayout(): void;
  isLayoutRunning(): boolean;
}

export type ExploreRequest = any;
export type SearchRequest = any;
export type ExploreResults = any;
export type SearchResults = any;
export interface WorkspaceLayoutController {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export type GraphExploreCallback = (data: ExploreResults) => void;
export type GraphSearchCallback = (data: SearchResults) => void;

export type WorkspaceOptions = {
  layoutController: WorkspaceLayoutController;
} & Partial<{
  indexName: string;
  vertex_fields: WorkspaceField[];
  nodeLabeller: (newNodes: WorkspaceNode[]) => void;
  changeHandler: () => void;
  exploreControls: AdvancedSettings;
}>;

export type ControlType =
  | 'style'
  | 'drillDowns'
  | 'editLabel'
  | 'mergeTerms'
  | 'none'
  | 'edgeSelection';
