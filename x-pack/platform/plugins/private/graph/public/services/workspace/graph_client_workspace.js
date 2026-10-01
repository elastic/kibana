/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana wrapper
import { unpackGroupedNodes } from './runtime_grouping';

// The main constructor for our GraphWorkspace
function GraphWorkspace(options) {
  this.blocklistedNodes = [];
  this.options = options;
  this.nodesMap = {};
  this.edgesMap = {};

  this.nodes = [];
  this.edges = [];
  const layoutController = options.layoutController;

  //======== Grouping functions ========

  this.returnUnpackedGroupeds = function (topLevelNodes) {
    return unpackGroupedNodes(topLevelNodes, this.edges);
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
}
//=====================

// Begin Kibana wrapper
export function createWorkspace(options) {
  return new GraphWorkspace(options);
}
