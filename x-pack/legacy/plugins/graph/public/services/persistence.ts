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
  IndexPatternSavedObject,
} from '../types';
import { getOutlinkEncoders } from './outlink_encoders';
import { urlTemplateIconChoicesByClass } from './style_choices';

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

function deserializeUrlTemplate({ encoderID, iconClass, ...serializableProps }: PersistedUrlTemplate) {
  const encoder = outlinkEncoders.find(outlinkEncoder => outlinkEncoder.id === encoderID);
  if (!encoder) {
    return;
  }

  const template: UrlTemplate = {
    ...serializableProps,
    encoder,
    icon: null
  };

  if (iconClass) {
    template.icon = urlTemplateIconChoicesByClass[iconClass] ?urlTemplateIconChoicesByClass[iconClass] : null;
        }


  return template;
}

export function 

export function savedWorkspaceToAppState(savedWorkspace: PersistedGraphWorkspace, indexPatterns: IndexPatternSavedObject[]) {
    const persistedWorkspaceState: PersistedWorkspaceState = JSON.parse(savedWorkspace.wsState);
    
    const urlTemplates = persistedWorkspaceState.urlTemplates.map(deserializeUrlTemplate).filter((template: UrlTemplate | undefined): template is UrlTemplate => Boolean(template));

    const indexPattern = indexPatterns.find(pattern => pattern.attributes.title === persistedWorkspaceState.indexPattern);

    if (!indexPattern) {
      throw new Error('Index pattern not found');
    }
    // const wsObj = JSON.parse($route.current.locals.savedWorkspace.wsState);
    // $scope.savedWorkspace = $route.current.locals.savedWorkspace;
    // $scope.description = $route.current.locals.savedWorkspace.description;

    // // Load any saved drill-down templates
    // wsObj.urlTemplates.forEach(urlTemplate => {
    //   const encoder = $scope.outlinkEncoders.find(outlinkEncoder => outlinkEncoder.id === urlTemplate.encoderID);
    //   if (encoder) {
    //     const template = {
    //       url: urlTemplate.url,
    //       description: urlTemplate.description,
    //       encoder: encoder,
    //     };
    //     if (urlTemplate.iconClass) {
    //       template.icon = drillDownIconChoicesByClass[urlTemplate.iconClass];
    //     }
    //     $scope.urlTemplates.push(template);
    //   }
    // });

    // //Lookup the saved index pattern title
    // let savedObjectIndexPattern = null;
    // $scope.indices.forEach(function (savedObject) {
    //   // wsObj.indexPattern is the title string of an indexPattern which
    //   // we attempt here to look up in the list of currently saved objects
    //   // that contain index pattern definitions
    //   if(savedObject.attributes.title === wsObj.indexPattern) {
    //     savedObjectIndexPattern = savedObject;
    //   }
    // });
    // if(!savedObjectIndexPattern) {
    //   toastNotifications.addDanger(
    //     i18n.translate('xpack.graph.loadWorkspace.missingIndexPatternErrorMessage', {
    //       defaultMessage: 'Missing index pattern {indexPattern}',
    //       values: { indexPattern: wsObj.indexPattern },
    //     })
    //   );
    //   return;
    // }

    // $scope.indexSelected(savedObjectIndexPattern, function () {
    //   Object.assign($scope.exploreControls, wsObj.exploreControls);

    //   if ($scope.exploreControls.sampleDiversityField) {
    //     $scope.exploreControls.sampleDiversityField =  $scope.allFields.find(field =>
    //       $scope.exploreControls.sampleDiversityField.name === field.name);
    //   }

    //   for (const i in wsObj.selectedFields) {
    //     const savedField = wsObj.selectedFields[i];
    //     for (const f in $scope.allFields) {
    //       const field = $scope.allFields[f];
    //       if (savedField.name === field.name) {
    //         field.hopSize = savedField.hopSize;
    //         field.lastValidHopSize = savedField.lastValidHopSize;
    //         field.color = savedField.color;
    //         field.icon = $scope.iconChoicesByClass[savedField.iconClass];
    //         field.selected = true;
    //         $scope.selectedFields.push(field);
    //         break;
    //       }
    //     }
    //     //TODO what if field name no longer exists as part of the index-pattern definition?
    //   }

    //   $scope.updateLiveResponseFields();
    //   initWorkspaceIfRequired();
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