/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppState } from '../types';

export function appStateToSavedWorkspace(
  { workspace, urlTemplates, advancedSettings }: AppState,
  canSaveData: boolean
) {
  let blacklist = [];
  let vertices = [];
  let links = [];
  if (canSaveData) {
    blacklist = workspace.blacklistedNodes.map(function(node) {
      return {
        x: node.x,
        y: node.y,
        field: node.data.field,
        term: node.data.term,
        label: node.label,
        color: node.color,
        parent: null,
        weight: node.weight,
        size: node.scaledSize,
      };
    });
    vertices = workspace.nodes.map(function(node) {
      return {
        x: node.x,
        y: node.y,
        field: node.data.field,
        term: node.data.term,
        label: node.label,
        color: node.color,
        parent: node.parent ? workspace.nodes.indexOf(node.parent) : null,
        weight: node.weight,
        size: node.scaledSize,
      };
    });
    links = workspace.edges.map(function(edge) {
      return {
        weight: edge.weight,
        width: edge.width,
        inferred: edge.inferred,
        label: edge.label,
        source: workspace.nodes.indexOf(edge.source),
        target: workspace.nodes.indexOf(edge.target),
      };
    });
  }

  const mappedUrlTemplates = urlTemplates.map(function(template) {
    const result = {
      url: template.url,
      description: template.description,
      encoderID: template.encoder.id,
    };
    if (template.icon) {
      result.iconClass = template.icon.class;
    }
    return result;
  });

  $scope.savedWorkspace.wsState = JSON.stringify({
    indexPattern: $scope.selectedIndex.attributes.title,
    selectedFields: $scope.selectedFields.map(function(field) {
      return {
        name: field.name,
        lastValidHopSize: field.lastValidHopSize,
        color: field.color,
        iconClass: field.icon.class,
        hopSize: field.hopSize,
      };
    }),
    blacklist,
    vertices,
    links,
    urlTemplates: mappedUrlTemplates,
    exploreControls: advancedSettings,
  });
  $scope.savedWorkspace.numVertices = vertices.length;
  $scope.savedWorkspace.numLinks = links.length;
}
