/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AppState,
  PersistedNode,
  WorkspaceNode,
  WorkspaceEdge,
  PersistedEdge,
  UrlTemplate,
  PersistedUrlTemplate,
  WorkspaceField,
  PersistedGraphWorkspace,
  PersistedWorkspaceState,
} from '../../types';

function serializeNode(
  { data, scaledSize, parent, x, y, label, color }: WorkspaceNode,
  allNodes: WorkspaceNode[] = []
): PersistedNode {
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
  { source, target, weight, width, inferred, label }: WorkspaceEdge,
  allNodes: WorkspaceNode[] = []
): PersistedEdge {
  return {
    weight,
    width,
    inferred,
    label,
    source: allNodes.indexOf(source),
    target: allNodes.indexOf(target),
  };
}

function serializeUrlTemplate({ encoder, icon, url, description, isDefault }: UrlTemplate) {
  const serializedTemplate: PersistedUrlTemplate = {
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

function serializeField({ icon, hopSize, lastValidHopSize, color, selected }: WorkspaceField) {
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
  currentSavedWorkspace: PersistedGraphWorkspace,
  { workspace, urlTemplates, advancedSettings, selectedIndex, selectedFields }: AppState,
  canSaveData: boolean
) {
  const blacklist: PersistedNode[] = canSaveData
    ? workspace.blacklistedNodes.map(node => serializeNode(node))
    : [];
  const vertices: PersistedNode[] = canSaveData
    ? workspace.nodes.map(node => serializeNode(node, workspace.nodes))
    : [];
  const links: PersistedEdge[] = canSaveData
    ? workspace.edges.map(edge => serializeEdge(edge, workspace.nodes))
    : [];

  const mappedUrlTemplates = urlTemplates.map(serializeUrlTemplate);

  const persistedWorkspaceState: PersistedWorkspaceState = {
    indexPattern: selectedIndex.attributes.title,
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
