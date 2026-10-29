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
import type {
  IndexpatternDatasource,
  WorkspaceState,
  WorkspaceNodeState,
  WorkspaceEdgeState,
} from '../../state_management';

const serializeNode = (
  { data, scaledSize, parentId, x, y, label, color }: WorkspaceNodeState,
  nodeIndexes: ReadonlyMap<string, number> = new Map()
): SerializedNode => ({
  x,
  y,
  label,
  color,
  field: data.field,
  term: data.term,
  parent: parentId ? nodeIndexes.get(parentId) ?? null : null,
  size: scaledSize,
});

const serializeEdge = (
  { sourceId, targetId, weight, width, label }: WorkspaceEdgeState,
  nodeIndexes: ReadonlyMap<string, number>
): SerializedEdge => ({
  weight,
  width,
  label,
  source: nodeIndexes.get(sourceId) ?? -1,
  target: nodeIndexes.get(targetId) ?? -1,
});

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
    ? workspace.nodeIds.map((nodeId) => serializeNode(workspace.nodesById[nodeId], nodeIndexes))
    : [];
  const blocklist: SerializedNode[] = canSaveData
    ? workspace.blocklistedNodeIds.map((nodeId) =>
        serializeNode(workspace.blocklistedNodesById[nodeId])
      )
    : [];
  const links: SerializedEdge[] = canSaveData
    ? workspace.edgeIds.map((edgeId) => serializeEdge(workspace.edgesById[edgeId], nodeIndexes))
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
