/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/legacy/core_plugins/data/public/';
import {
  SerializedNode,
  UrlTemplate,
  SerializedUrlTemplate,
  WorkspaceField,
  GraphWorkspaceSavedObject,
  SerializedWorkspaceState,
  IndexPatternSavedObject,
  AdvancedSettings,
  GraphData,
  Workspace,
  SerializedField,
} from '../../types';
import { outlinkEncoders } from '../../helpers/outlink_encoders';
import {
  urlTemplateIconChoicesByClass,
  getSuitableIcon,
  colorChoices,
  iconChoicesByClass,
} from '../../helpers/style_choices';

const defaultAdvancedSettings: AdvancedSettings = {
  useSignificance: true,
  sampleSize: 2000,
  timeoutMillis: 5000,
  maxValuesPerDoc: 1,
  minDocCount: 3,
};

function deserializeUrlTemplate({
  encoderID,
  iconClass,
  ...serializableProps
}: SerializedUrlTemplate) {
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
  savedWorkspace: GraphWorkspaceSavedObject,
  indexPatterns: IndexPatternSavedObject[]
) {
  const serializedWorkspaceState: SerializedWorkspaceState = JSON.parse(savedWorkspace.wsState);
  const indexPattern = indexPatterns.find(
    pattern => pattern.attributes.title === serializedWorkspaceState.indexPattern
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
    .filter(field => !blockedFieldNames.includes(field.name))
    .map((field, index) => ({
      name: field.name,
      hopSize: defaultHopSize,
      lastValidHopSize: defaultHopSize,
      icon: getSuitableIcon(field.name),
      color: colorChoices[index % colorChoices.length],
      selected: false,
      type: field.type,
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

function getFieldsWithWorkspaceSettings(
  indexPattern: IndexPattern,
  selectedFields: SerializedField[]
) {
  const allFields = mapFields(indexPattern);

  // merge in selected information into all fields
  selectedFields.forEach(serializedField => {
    const workspaceField = allFields.find(field => field.name === serializedField.name);
    if (!workspaceField) {
      return;
    }
    workspaceField.hopSize = serializedField.hopSize;
    workspaceField.lastValidHopSize = serializedField.lastValidHopSize;
    workspaceField.color = serializedField.color;
    workspaceField.icon = iconChoicesByClass[serializedField.iconClass]!;
    workspaceField.selected = true;
  });

  return allFields;
}

function getBlacklistedNodes(
  serializedWorkspaceState: SerializedWorkspaceState,
  allFields: WorkspaceField[]
) {
  return serializedWorkspaceState.blacklist.map(serializedNode => {
    const currentField = allFields.find(field => field.name === serializedNode.field)!;
    return {
      x: 0,
      y: 0,
      label: serializedNode.label,
      color: serializedNode.color,
      icon: currentField.icon,
      parent: null,
      scaledSize: 0,
      data: {
        field: serializedNode.field,
        term: serializedNode.term,
      },
    };
  });
}

function resolveGroups(nodes: SerializedNode[], workspaceInstance: Workspace) {
  nodes.forEach(({ field, term, x, y, parent }) => {
    const nodeId = makeNodeId(field, term);
    const workspaceNode = workspaceInstance.nodesMap[nodeId];
    workspaceNode.x = x;
    workspaceNode.y = y;
    if (parent !== null) {
      const { field: parentField, term: parentTerm } = nodes[parent];
      const parentId = makeNodeId(parentField, parentTerm);
      workspaceNode.parent = workspaceInstance.nodesMap[parentId];
    }
  });
}

function getNodesAndEdges(
  persistedWorkspaceState: SerializedWorkspaceState,
  allFields: WorkspaceField[]
): GraphData {
  return {
    nodes: persistedWorkspaceState.vertices.map(serializedNode => ({
      ...serializedNode,
      id: '',
      icon: allFields.find(field => field.name === serializedNode.field)!.icon,
      data: {
        field: serializedNode.field,
        term: serializedNode.term,
      },
    })),
    edges: persistedWorkspaceState.links.map(serializedEdge => ({
      ...serializedEdge,
      id: '',
    })),
  };
}

export function makeNodeId(field: string, term: string) {
  return field + '..' + term;
}

export function savedWorkspaceToAppState(
  savedWorkspace: GraphWorkspaceSavedObject,
  indexPattern: IndexPattern,
  workspaceInstance: Workspace
): {
  urlTemplates: UrlTemplate[];
  advancedSettings: AdvancedSettings;
  allFields: WorkspaceField[];
} {
  const persistedWorkspaceState: SerializedWorkspaceState = JSON.parse(savedWorkspace.wsState);

  // ================== url templates =============================
  const urlTemplates = persistedWorkspaceState.urlTemplates
    .map(deserializeUrlTemplate)
    .filter((template: UrlTemplate | undefined): template is UrlTemplate => Boolean(template));

  // ================== fields =============================
  const allFields = getFieldsWithWorkspaceSettings(
    indexPattern,
    persistedWorkspaceState.selectedFields
  );
  const selectedFields = allFields.filter(field => field.selected);
  workspaceInstance.options.vertex_fields = selectedFields;

  // ================== advanced settings =============================
  const advancedSettings = Object.assign(
    {},
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

  workspaceInstance.options.exploreControls = advancedSettings;

  // ================== nodes and edges =============================
  const graph = getNodesAndEdges(persistedWorkspaceState, allFields);
  workspaceInstance.mergeGraph(graph);
  resolveGroups(persistedWorkspaceState.vertices, workspaceInstance);

  // ================== blacklist =============================
  const blacklistedNodes = getBlacklistedNodes(persistedWorkspaceState, allFields);
  workspaceInstance.blacklistedNodes.push(...blacklistedNodes);

  return {
    urlTemplates,
    advancedSettings,
    allFields,
  };
}
