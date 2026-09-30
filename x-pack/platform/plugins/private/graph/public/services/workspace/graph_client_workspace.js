/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana wrapper
import { mergeRuntimeGraph } from './runtime_graph_merge';

// The main constructor for our GraphWorkspace
function GraphWorkspace(options) {
  this.blocklistedNodes = [];
  this.options = options;

  if (!options) {
    this.options = {};
  }
  this.nodesMap = {};
  this.edgesMap = {};
  this.searchTerm = '';

  //A sequence number used to know when a node was added
  this.seqNumber = 0;

  this.nodes = [];
  this.edges = [];
  const layoutController = options.layoutController;

  //======== Selection functions ========

  this.returnUnpackedGroupeds = function (topLevelNodeArray) {
    //Gather any grouped nodes that are part of this top-level selection
    const result = topLevelNodeArray.slice();

    // We iterate over edges not nodes because edges conveniently hold the top-most
    // node information.

    const edges = this.edges;
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];

      const topLevelSource = edge.topSrc;
      const topLevelTarget = edge.topTarget;

      if (result.indexOf(topLevelTarget) >= 0) {
        //visible top-level node is selected - add all nesteds starting from bottom up
        let target = edge.target;
        while (target.parent !== undefined) {
          if (result.indexOf(target) < 0) {
            result.push(target);
          }
          target = target.parent;
        }
      }

      if (result.indexOf(topLevelSource) >= 0) {
        //visible top-level node is selected - add all nesteds starting from bottom up
        let source = edge.source;
        while (source.parent !== undefined) {
          if (result.indexOf(source) < 0) {
            result.push(source);
          }
          source = source.parent;
        }
      }
    } //end of edges loop

    return result;
  };

  //====== Layout functions ========

  /**
   * @type void
   */
  this.stopLayout = function () {
    layoutController.stop();
  };
  /**
   * @type void
   */
  this.runLayout = function () {
    layoutController.start();
  };
  this.isLayoutRunning = function () {
    return layoutController.isRunning();
  };

  this.mergeGraph = function (newData) {
    this.seqNumber = mergeRuntimeGraph(this, newData, this.seqNumber);
  };
}
//=====================

// Begin Kibana wrapper
export function createWorkspace(options) {
  return new GraphWorkspace(options);
}
