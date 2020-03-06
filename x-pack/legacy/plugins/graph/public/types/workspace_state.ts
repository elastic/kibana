/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FontawesomeIcon } from '../helpers/style_choices';
import { WorkspaceField, AdvancedSettings } from './app_state';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/public';

export interface WorkspaceNode {
  x: number;
  y: number;
  label: string;
  icon: FontawesomeIcon;
  data: {
    field: string;
    term: string;
  };
  scaledSize: number;
  parent: WorkspaceNode | null;
  color: string;
  isSelected?: boolean;
}

export interface WorkspaceEdge {
  weight: number;
  width: number;
  label: string;
  source: WorkspaceNode;
  target: WorkspaceNode;
  isSelected?: boolean;
}

export interface ServerResultNode {
  field: string;
  term: string;
  id: string;
  label: string;
  color: string;
  icon: FontawesomeIcon;
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

export interface GraphData {
  nodes: ServerResultNode[];
  edges: ServerResultEdge[];
}

export interface Workspace {
  options: WorkspaceOptions;
  nodesMap: Record<string, WorkspaceNode>;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  blacklistedNodes: WorkspaceNode[];

  getQuery(startNodes?: WorkspaceNode[], loose?: boolean): JsonObject;
  getSelectedOrAllNodes(): WorkspaceNode[];
  getLikeThisButNotThisQuery(startNodes?: WorkspaceNode[]): JsonObject;

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

  /**
   * Fills in missing connections between the selected nodes.
   * @param connections The number of connections to fill in. Defaults to 10
   */
  fillInGraph(connections?: number): void;

  runLayout(): void;
  stopLayout(): void;
}

export type ExploreRequest = any;
export type SearchRequest = any;
export type ExploreResults = any;
export type SearchResults = any;

export type WorkspaceOptions = Partial<{
  indexName: string;
  vertex_fields: WorkspaceField[];
  nodeLabeller: (newNodes: WorkspaceNode[]) => void;
  changeHandler: () => void;
  graphExploreProxy: (
    indexPattern: string,
    request: ExploreRequest,
    callback: (data: ExploreResults) => void
  ) => void;
  searchProxy: (
    indexPattern: string,
    request: SearchRequest,
    callback: (data: SearchResults) => void
  ) => void;
  exploreControls: AdvancedSettings;
}>;
