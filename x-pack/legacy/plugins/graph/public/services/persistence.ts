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
  Field,
  PersistedGraphWorkspace,
  PersistedWorkspaceState,
} from '../types';

function serializeNode(
  { icon, data, scaledSize, parent, ...serializableProps }: WorkspaceNode,
  allNodes: WorkspaceNode[] = []
): PersistedNode {
  return {
    ...serializableProps,
    field: data.field,
    term: data.term,
    parent: parent ? allNodes.indexOf(parent) : null,
    size: scaledSize,
  };
}

function serializeEdge(
  { source, target, ...serializableProbs }: WorkspaceEdge,
  allNodes: WorkspaceNode[] = []
): PersistedEdge {
  return {
    ...serializableProbs,
    source: allNodes.indexOf(source),
    target: allNodes.indexOf(target),
  };
}

function serializeUrlTemplate({ encoder, icon, ...serializableProps }: UrlTemplate) {
  const serializedTemplate: PersistedUrlTemplate = {
    ...serializableProps,
    encoderID: encoder.id,
  };
  if (icon) {
    serializedTemplate.iconClass = icon.class;
  }
  return serializedTemplate;
}

function serializeField({ icon, ...serializableProps }: Field) {
  return {
    ...serializableProps,
    iconClass: icon.class,
  };
}

export function appStateToSavedWorkspace(
  currentSavedWorkspace: PersistedGraphWorkspace,
  { workspace, urlTemplates, advancedSettings, selectedIndex, selectedFields }: AppState,
  canSaveData: boolean
): PersistedGraphWorkspace {
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

  return {
    ...currentSavedWorkspace,
    wsState: JSON.stringify(persistedWorkspaceState),
    numVertices: vertices.length,
    numLinks: links.length,
  };
}
