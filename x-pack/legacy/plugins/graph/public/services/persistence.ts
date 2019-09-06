/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/legacy/core_plugins/data/public/index_patterns/index_patterns';
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
  IndexPatternSavedObject,
  AdvancedSettings,
  GraphData,
  Workspace,
} from '../types';
import { getOutlinkEncoders } from './outlink_encoders';
import {
  urlTemplateIconChoicesByClass,
  getSuitableIcon,
  colorChoices,
  iconChoicesByClass,
} from './style_choices';

const outlinkEncoders = getOutlinkEncoders();

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

function serializeField({ icon, ...serializableProps }: WorkspaceField) {
  return {
    ...serializableProps,
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

function deserializeUrlTemplate({
  encoderID,
  iconClass,
  ...serializableProps
}: PersistedUrlTemplate) {
  const encoder = outlinkEncoders.find(outlinkEncoder => outlinkEncoder.id === encoderID);
  if (!encoder) {
    return;
  }

  const template: UrlTemplate = {
    ...serializableProps,
    encoder,
    icon: null,
  };

  if (iconClass) {
    const iconCandidate = urlTemplateIconChoicesByClass[iconClass];
    template.icon = iconCandidate ? iconCandidate : null;
  }

  return template;
}

// returns the id of the index pattern, lookup is done in app.js
export function lookupIndexPattern(
  savedWorkspace: PersistedGraphWorkspace,
  indexPatterns: IndexPatternSavedObject[]
) {
  const persistedWorkspaceState: PersistedWorkspaceState = JSON.parse(savedWorkspace.wsState);
  const indexPattern = indexPatterns.find(
    pattern => pattern.attributes.title === persistedWorkspaceState.indexPattern
  );

  if (indexPattern) {
    return indexPattern;
  }
}

// returns all graph fields mapped out of the index pattern
export function mapFields(indexPattern: IndexPattern): WorkspaceField[] {
  const blockedFieldNames = ['_id', '_index', '_score', '_source', '_type'];
  const defaultHopSize = 5;

  return indexPattern
    .getNonScriptedFields()
    .filter(field => blockedFieldNames.includes(field.name))
    .map((field, index) => ({
      name: field.name,
      hopSize: defaultHopSize,
      lastValidHopSize: defaultHopSize,
      icon: getSuitableIcon(field.name),
      color: colorChoices[index % colorChoices.length],
      selected: false,
    }))
    .sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
}

export function makeNodeId(field: string, term: string) {
  return field + '..' + term;
}

export function savedWorkspaceToAppState(
  savedWorkspace: PersistedGraphWorkspace,
  indexPattern: IndexPattern,
  workspaceInstance: Workspace
): Pick<
  AppState,
  'urlTemplates' | 'advancedSettings' | 'workspace' | 'allFields' | 'selectedFields'
> {
  const defaultAdvancedSettings: AdvancedSettings = {
    useSignificance: true,
    sampleSize: 2000,
    timeoutMillis: 5000,
    maxValuesPerDoc: 1,
    minDocCount: 3,
  };
  const persistedWorkspaceState: PersistedWorkspaceState = JSON.parse(savedWorkspace.wsState);

  // todo clean this part up

  // ================== url templates =============================
  const urlTemplates = persistedWorkspaceState.urlTemplates
    .map(deserializeUrlTemplate)
    .filter((template: UrlTemplate | undefined): template is UrlTemplate => Boolean(template));

  // ================== fields =============================
  const allFields = mapFields(indexPattern);

  // merge in selected information into all fields
  persistedWorkspaceState.selectedFields.forEach(serializedField => {
    const workspaceField = allFields.find(field => field.name === serializedField.name);
    if (!workspaceField) {
      return;
    }
    workspaceField.hopSize = serializedField.hopSize;
    workspaceField.lastValidHopSize = serializedField.lastValidHopSize;
    workspaceField.color = serializedField.color;
    // TODO handle this
    workspaceField.icon = iconChoicesByClass[serializedField.iconClass]!;
    workspaceField.selected = true;
  });

  const selectedFields = allFields.filter(field => field.selected);

  // ================== advanced settings =============================
  const advancedSettings = Object.assign(
    defaultAdvancedSettings,
    persistedWorkspaceState.exploreControls
  );

  if (advancedSettings.sampleDiversityField) {
    // restore reference to sample diversity field
    const serializedField = advancedSettings.sampleDiversityField;
    advancedSettings.sampleDiversityField = allFields.find(
      field => field.name === serializedField.name
    );
  }

  // ================== nodes and edges =============================
  const graph: GraphData = {
    nodes: persistedWorkspaceState.vertices.map(serializedNode => ({
      id: '',
      field: serializedNode.field,
      term: serializedNode.term,
      label: serializedNode.label,
      color: serializedNode.color,
      icon: allFields.find(field => field.name === serializedNode.field)!.icon,
      data: {
        field: serializedNode.field,
        term: serializedNode.term,
      },
    })),
    edges: persistedWorkspaceState.links.map(serializedEdge => ({
      id: '',
      source: serializedEdge.source,
      target: serializedEdge.target,
      inferred: serializedEdge.inferred,
      label: serializedEdge.label,
      width: serializedEdge.width,
      weight: serializedEdge.weight,
    })),
  };

  workspaceInstance.mergeGraph(graph);

  persistedWorkspaceState.vertices.forEach(persistedNode => {
    const nodeId = makeNodeId(persistedNode.field, persistedNode.term);
    const workspaceNode = workspaceInstance.nodesMap[nodeId];
    workspaceNode.x = persistedNode.x;
    workspaceNode.y = persistedNode.y;

    if (persistedNode.parent !== null) {
      const persistedParentNode = persistedWorkspaceState.vertices[persistedNode.parent];
      const parentId = makeNodeId(persistedParentNode.field, persistedParentNode.term);
      workspaceNode.parent = workspaceInstance.nodesMap[parentId];
    }
  });

  // ================== blacklist =============================
  const blacklistedNodes = persistedWorkspaceState.blacklist.map(persistedNode => {
    const currentField = allFields.find(field => field.name === persistedNode.field)!;
    return {
      x: 0,
      y: 0,
      label: persistedNode.label,
      color: persistedNode.color,
      icon: currentField.icon,
      parent: null,
      scaledSize: 0,
      data: {
        field: persistedNode.field,
        term: persistedNode.term,
      },
    };
  });

  workspaceInstance.blacklistedNodes.push(...blacklistedNodes);

  return {
    urlTemplates,
    advancedSettings,
    workspace: workspaceInstance,
    allFields,
    selectedFields,
  };
}
