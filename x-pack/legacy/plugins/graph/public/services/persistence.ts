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
} from '../types';
import { getOutlinkEncoders } from './outlink_encoders';
import { urlTemplateIconChoicesByClass, getSuitableIcon, colorChoices, iconChoicesByClass } from './style_choices';

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
    template.icon = urlTemplateIconChoicesByClass[iconClass]
      ? urlTemplateIconChoicesByClass[iconClass]
      : null;
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
    return indexPattern.id;
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

// 1. call lookupIndexPattern()
// fetch index pattern
// 2. call savedWorkspaceToAppState() to map everything
// 2.1. savedWorkspaceToAppState will call mapFields under the hood (will also be called by "new workspace" branch if selecting an index pattern)
export function savedWorkspaceToAppState(
  savedWorkspace: PersistedGraphWorkspace,
  indexPattern: IndexPattern
) {
  const defaultAdvancedSettings: AdvancedSettings = {
      useSignificance: true,
      sampleSize: 2000,
      timeoutMillis: 5000,
      maxValuesPerDoc: 1,
      minDocCount: 3
  };
  const persistedWorkspaceState: PersistedWorkspaceState = JSON.parse(savedWorkspace.wsState);

  const urlTemplates = persistedWorkspaceState.urlTemplates
    .map(deserializeUrlTemplate)
    .filter((template: UrlTemplate | undefined): template is UrlTemplate => Boolean(template));

  const allFields = mapFields(indexPattern);

  const advancedSettings = Object.assign(defaultAdvancedSettings, persistedWorkspaceState.exploreControls);

  if (advancedSettings.sampleDiversityField) {
    // restore reference to sample diversity field
    const serializedField = advancedSettings.sampleDiversityField;
    advancedSettings.sampleDiversityField = allFields.find(field => field.name === serializedField.name);
  }

  persistedWorkspaceState.selectedFields.forEach(serializedField => {
    const workspaceField = allFields.find(field => field.name === serializedField.name);
    if (!workspaceField) {
      return;
    }
    workspaceField.hopSize = serializedField.hopSize;
    workspaceField.lastValidHopSize = serializedField.lastValidHopSize;
    workspaceField.color = serializedField.color;
    workspaceField.icon = iconChoicesByClass[serializedField.iconClass];
    workspaceField.selected = true;
  });

  //   const graph = {
  //     nodes: [],
  //     edges: []
  //   };
  //   for (const i in wsObj.vertices) {
  //     var vertex = wsObj.vertices[i]; // eslint-disable-line no-var
  //     const node = {
  //       field: vertex.field,
  //       term: vertex.term,
  //       label: vertex.label,
  //       color: vertex.color,
  //       icon: $scope.allFields.filter(function (fieldDef) {
  //         return vertex.field === fieldDef.name;
  //       })[0].icon,
  //       data: {}
  //     };
  //     graph.nodes.push(node);
  //   }
  //   for (const i in wsObj.blacklist) {
  //     var vertex = wsObj.vertices[i]; // eslint-disable-line no-var
  //     const fieldDef = $scope.allFields.filter(function (fieldDef) {
  //       return vertex.field === fieldDef.name;
  //     })[0];
  //     if (fieldDef) {
  //       const node = {
  //         field: vertex.field,
  //         term: vertex.term,
  //         label: vertex.label,
  //         color: vertex.color,
  //         icon: fieldDef.icon,
  //         data: {
  //           field: vertex.field,
  //           term: vertex.term
  //         }
  //       };
  //       $scope.workspace.blacklistedNodes.push(node);
  //     }
  //   }
  //   for (const i in wsObj.links) {
  //     const link = wsObj.links[i];
  //     graph.edges.push({
  //       source: link.source,
  //       target: link.target,
  //       inferred: link.inferred,
  //       label: link.label,
  //       term: vertex.term,
  //       width: link.width,
  //       weight: link.weight
  //     });
  //   }

  //   $scope.workspace.mergeGraph(graph);

  //   // Wire up parents and children
  //   for (const i in wsObj.vertices) {
  //     const vertex = wsObj.vertices[i];
  //     const vId = $scope.workspace.makeNodeId(vertex.field, vertex.term);
  //     const visNode = $scope.workspace.nodesMap[vId];
  //     // Default the positions.
  //     visNode.x = vertex.x;
  //     visNode.y = vertex.y;
  //     if (vertex.parent !== null) {
  //       const parentSavedObj = graph.nodes[vertex.parent];
  //       const parentId = $scope.workspace.makeNodeId(parentSavedObj.field, parentSavedObj.term);
  //       visNode.parent = $scope.workspace.nodesMap[parentId];
  //     }
  //   }
}
