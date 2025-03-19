/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/public';
import { AdvancedSettings, UrlTemplate, WorkspaceField } from './app_state';
import { WorkspaceNode, WorkspaceEdge } from './workspace_state';

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

/**
 * Workspace fetched from server.
 */
export interface GraphWorkspaceSavedObject {
  copyOnSave?: boolean;
  description: string;
  displayName: string;
  getEsType(): string;
  id?: string;
  isSaving?: boolean;
  lastSavedTitle?: string;
  migrationVersion?: Record<string, any>;
  numLinks: number;
  numVertices: number;
  title: string;
  type: string;
  version?: number;
  wsState: string;
  // the title of the index pattern used by this workspace.
  // Only set for legacy saved objects.
  legacyIndexPatternRef?: string;
  _source: Record<string, unknown>;
  updatedAt?: string;
  references: SavedObjectReference[];
}

export interface SerializedWorkspaceState {
  // the id of the index pattern saved object
  indexPattern: string;
  selectedFields: SerializedField[];
  blocklist: SerializedNode[];
  vertices: SerializedNode[];
  links: SerializedEdge[];
  urlTemplates: SerializedUrlTemplate[];
  exploreControls: AdvancedSettings;
}

export interface SerializedUrlTemplate extends Omit<UrlTemplate, 'encoder' | 'icon'> {
  encoderID: string;
  iconClass?: string;
}
export interface SerializedField extends Omit<WorkspaceField, 'icon' | 'type' | 'aggregatable'> {
  iconClass: string;
}

export interface SerializedNode extends Pick<WorkspaceNode, 'x' | 'y' | 'label' | 'color'> {
  field: string;
  term: string;
  parent: number | null;
  size: number;
}

export interface SerializedEdge
  extends Omit<WorkspaceEdge, 'source' | 'target' | 'topTarget' | 'topSrc'> {
  source: number;
  target: number;
}
