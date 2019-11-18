/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SerializedNode,
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
} from '../../types';
import { IndexpatternDatasource } from '../../state_management';

function serializeNode(
  { data, scaledSize, parent, x, y, label, color }: WorkspaceNode,
  allNodes: WorkspaceNode[] = []
): SerializedNode {
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
    serializedTemplate.iconClass = icon.class;
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
    iconClass: icon.class,
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
  const blacklist: SerializedNode[] = canSaveData
    ? workspace.blacklistedNodes.map(node => serializeNode(node))
    : [];
  const vertices: SerializedNode[] = canSaveData
    ? workspace.nodes.map(node => serializeNode(node, workspace.nodes))
    : [];
  const links: SerializedEdge[] = canSaveData
    ? workspace.edges.map(edge => serializeEdge(edge, workspace.nodes))
    : [];

  const mappedUrlTemplates = urlTemplates.map(serializeUrlTemplate);

  const persistedWorkspaceState: SerializedWorkspaceState = {
    indexPattern: selectedIndex.title,
    selectedFields: selectedFields.map(serializeField),
    blacklist,
    vertices,
    links,
    urlTemplates: mappedUrlTemplates,
    exploreControls: advancedSettings,
  };

  currentSavedWorkspace.wsState = JSON.stringify(persistedWorkspaceState);
  currentSavedWorkspace.numVertices = vertices.length;
  currentSavedWorkspace.numLinks = links.length;
}
