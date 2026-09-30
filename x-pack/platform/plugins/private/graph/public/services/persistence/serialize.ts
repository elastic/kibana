/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
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
import type { IndexpatternDatasource, WorkspaceState } from '../../state_management';

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

interface SerializableAppState {
  urlTemplates: UrlTemplate[];
  advancedSettings: AdvancedSettings;
  selectedIndex: IndexpatternDatasource;
  selectedFields: WorkspaceField[];
}

const serializeConfiguration = ({
  urlTemplates,
  advancedSettings,
  selectedIndex,
  selectedFields,
}: SerializableAppState) => ({
  indexPattern: selectedIndex.id,
  selectedFields: selectedFields.map(serializeField),
  urlTemplates: urlTemplates.map(serializeUrlTemplate),
  exploreControls: advancedSettings,
});

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

  const persistedWorkspaceState: SerializedWorkspaceState = {
    ...serializeConfiguration({
      urlTemplates,
      advancedSettings,
      selectedIndex,
      selectedFields,
    }),
    blocklist,
    vertices,
    links,
  };

  currentSavedWorkspace.wsState = JSON.stringify(persistedWorkspaceState);
  currentSavedWorkspace.numVertices = vertices.length;
  currentSavedWorkspace.numLinks = links.length;
}

export function reduxStateToSavedWorkspace(
  currentSavedWorkspace: GraphWorkspaceSavedObject,
  { workspace, ...configuration }: SerializableAppState & { workspace: WorkspaceState },
  canSaveData: boolean
) {
  const nodeIndexes = new Map(workspace.nodeIds.map((nodeId, index) => [nodeId, index]));
  const vertices: SerializedNode[] = canSaveData
    ? workspace.nodeIds.map((nodeId) => {
        const node = workspace.nodesById[nodeId];
        return {
          x: node.x,
          y: node.y,
          label: node.label,
          color: node.color,
          field: node.data.field,
          term: node.data.term,
          parent: node.parentId ? nodeIndexes.get(node.parentId) ?? null : null,
          size: node.scaledSize,
        };
      })
    : [];
  const blocklist: SerializedNode[] = canSaveData
    ? workspace.blocklistedNodeIds.map((nodeId) => {
        const node = workspace.blocklistedNodesById[nodeId];
        return {
          x: node.x,
          y: node.y,
          label: node.label,
          color: node.color,
          field: node.data.field,
          term: node.data.term,
          parent: null,
          size: node.scaledSize,
        };
      })
    : [];
  const links: SerializedEdge[] = canSaveData
    ? workspace.edgeIds.map((edgeId) => {
        const edge = workspace.edgesById[edgeId];
        return {
          weight: edge.weight,
          width: edge.width,
          label: edge.label,
          source: nodeIndexes.get(edge.sourceId) ?? -1,
          target: nodeIndexes.get(edge.targetId) ?? -1,
        };
      })
    : [];

  const persistedWorkspaceState: SerializedWorkspaceState = {
    ...serializeConfiguration(configuration),
    blocklist,
    vertices,
    links,
  };
  currentSavedWorkspace.wsState = JSON.stringify(persistedWorkspaceState);
  currentSavedWorkspace.numVertices = vertices.length;
  currentSavedWorkspace.numLinks = links.length;
}
