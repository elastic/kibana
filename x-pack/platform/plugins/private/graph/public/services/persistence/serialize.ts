/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WorkspaceNode,
  WorkspaceEdge,
  SerializedEdge,
  UrlTemplate,
  SerializedUrlTemplate,
  WorkspaceField,
  GraphWorkspaceSavedObject,
  SerializedWorkspaceState,
  Workspace,
  AdvancedSettings,
  SerializedNode,
  BlockListedNode,
} from '../../types';
import { IndexpatternDatasource } from '../../state_management';

function serializeNode(
  { data, scaledSize, parent, x, y, label, color }: BlockListedNode,
  allNodes: WorkspaceNode[] = []
) {
  return {
    x,
    y,
    label,
    color,
    field: data.field,
    term: data.term,
    parent: parent ? allNodes.indexOf(parent) : null,
    size: scaledSize,
  };
}

function serializeEdge(
  { source, target, weight, width, label }: WorkspaceEdge,
  allNodes: WorkspaceNode[] = []
): SerializedEdge {
  return {
    weight,
    width,
    label,
    source: allNodes.indexOf(source),
    target: allNodes.indexOf(target),
  };
}

function serializeUrlTemplate({ encoder, icon, url, description, isDefault }: UrlTemplate) {
  const serializedTemplate: SerializedUrlTemplate = {
    url,
    description,
    isDefault,
    encoderID: encoder.id,
  };
  if (icon) {
    serializedTemplate.iconClass = icon.id;
  }
  return serializedTemplate;
}

function serializeField({
  name,
  icon,
  hopSize,
  lastValidHopSize,
  color,
  selected,
}: WorkspaceField) {
  return {
    name,
    hopSize,
    lastValidHopSize,
    color,
    selected,
    iconClass: icon.id,
  };
}

export function appStateToSavedWorkspace(
  currentSavedWorkspace: GraphWorkspaceSavedObject,
  {
    workspace,
    urlTemplates,
    advancedSettings,
    selectedIndex,
    selectedFields,
  }: {
    workspace: Workspace;
    urlTemplates: UrlTemplate[];
    advancedSettings: AdvancedSettings;
    selectedIndex: IndexpatternDatasource;
    selectedFields: WorkspaceField[];
  },
  canSaveData: boolean
) {
  const blocklist: SerializedNode[] = canSaveData
    ? workspace.blocklistedNodes.map((node) => serializeNode(node))
    : [];
  const vertices: SerializedNode[] = canSaveData
    ? workspace.nodes.map((node) => serializeNode(node, workspace.nodes))
    : [];
  const links: SerializedEdge[] = canSaveData
    ? workspace.edges.map((edge) => serializeEdge(edge, workspace.nodes))
    : [];

  const mappedUrlTemplates = urlTemplates.map(serializeUrlTemplate);

  const persistedWorkspaceState: SerializedWorkspaceState = {
    indexPattern: selectedIndex.id,
    selectedFields: selectedFields.map(serializeField),
    blocklist,
    vertices,
    links,
    urlTemplates: mappedUrlTemplates,
    exploreControls: advancedSettings,
  };

  currentSavedWorkspace.wsState = JSON.stringify(persistedWorkspaceState);
  currentSavedWorkspace.numVertices = vertices.length;
  currentSavedWorkspace.numLinks = links.length;
}
