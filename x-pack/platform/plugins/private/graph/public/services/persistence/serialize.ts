/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SerializedEdge,
  UrlTemplate,
  SerializedUrlTemplate,
  WorkspaceField,
  GraphWorkspaceSavedObject,
  SerializedWorkspaceState,
  AdvancedSettings,
  SerializedNode,
} from '../../types';
import type { IndexpatternDatasource, WorkspaceState } from '../../state_management';

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
