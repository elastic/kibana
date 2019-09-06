/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'ui/saved_objects/saved_object';
import { AdvancedSettings, UrlTemplate, WorkspaceField } from './app_state';
import { WorkspaceNode, WorkspaceEdge } from './workspace_state';

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

/**
 * Workspace fetched from server.
 * This type is returned by `SavedWorkspacesProvider#get`.
 */
export interface PersistedGraphWorkspace extends SavedObject {
  title: string;
  description: string;
  numLinks: number;
  numVertices: number;
  version: number;
  wsState: string;
}

export interface PersistedWorkspaceState {
  indexPattern: string;
  selectedFields: PersistedField[];
  blacklist: PersistedNode[];
  vertices: PersistedNode[];
  links: PersistedEdge[];
  urlTemplates: PersistedUrlTemplate[];
  exploreControls: AdvancedSettings;
}

export interface PersistedUrlTemplate extends Omit<UrlTemplate, 'encoder' | 'icon'> {
  encoderID: string;
  iconClass?: string;
}
export interface PersistedField extends Omit<WorkspaceField, 'icon'> {
  iconClass: string;
}

export interface PersistedNode
  extends Omit<WorkspaceNode, 'icon' | 'data' | 'parent' | 'scaledSize'> {
  field: string;
  term: string;
  parent: number | null;
  size: number;
}

export interface PersistedEdge extends Omit<WorkspaceEdge, 'source' | 'target'> {
  source: number;
  target: number;
}
