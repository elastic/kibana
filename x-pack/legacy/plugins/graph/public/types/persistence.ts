/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedSettings, UrlTemplate, WorkspaceField } from './app_state';
import { WorkspaceNode, WorkspaceEdge } from './workspace_state';
import { SavedObject } from '../legacy_imports';

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

/**
 * Workspace fetched from server.
 * This type is returned by `SavedWorkspacesProvider#get`.
 */
export interface GraphWorkspaceSavedObject extends SavedObject {
  title: string;
  description: string;
  numLinks: number;
  numVertices: number;
  version: number;
  wsState: string;
}

export interface SerializedWorkspaceState {
  indexPattern: string;
  selectedFields: SerializedField[];
  blacklist: SerializedNode[];
  vertices: SerializedNode[];
  links: SerializedEdge[];
  urlTemplates: SerializedUrlTemplate[];
  exploreControls: AdvancedSettings;
}

export interface SerializedUrlTemplate extends Omit<UrlTemplate, 'encoder' | 'icon'> {
  encoderID: string;
  iconClass?: string;
}
export interface SerializedField extends Omit<WorkspaceField, 'icon' | 'type'> {
  iconClass: string;
}

export interface SerializedNode
  extends Omit<WorkspaceNode, 'icon' | 'data' | 'parent' | 'scaledSize'> {
  field: string;
  term: string;
  parent: number | null;
  size: number;
}

export interface SerializedEdge extends Omit<WorkspaceEdge, 'source' | 'target'> {
  source: number;
  target: number;
}
