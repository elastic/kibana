/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana wrapper
import {
  makeEdgeId,
  makeNodeId,
  materializeRuntimeEdge,
  materializeRuntimeNode,
  planIncomingEdges,
  prepareIncomingNodes,
} from './graph_merge_planner';

// ====== Undo operations =============

function AddNodeOperation(node, owner) {
  const self = this;
  const vm = owner;
  self.node = node;
  self.undo = function () {
    vm.arrRemove(vm.nodes, self.node);
    delete vm.nodesMap[self.node.id];
  };
  self.redo = function () {
    vm.nodes.push(self.node);
    vm.nodesMap[self.node.id] = self.node;
  };
}

function AddEdgeOperation(edge, owner) {
  const self = this;
  const vm = owner;
  self.edge = edge;
  self.undo = function () {
    vm.arrRemove(vm.edges, self.edge);
    delete vm.edgesMap[self.edge.id];
  };
  self.redo = function () {
    vm.edges.push(self.edge);
    vm.edgesMap[self.edge.id] = self.edge;
  };
}

function ReverseOperation(operation) {
  const self = this;
  const reverseOperation = operation;
  self.undo = reverseOperation.redo;
  self.redo = reverseOperation.undo;
}

function GroupOperation(receiver, orphan) {
  const self = this;
  self.receiver = receiver;
  self.orphan = orphan;
  self.undo = function () {
    self.orphan.parent = undefined;
  };
  self.redo = function () {
    self.orphan.parent = self.receiver;
  };
}

function UnGroupOperation(parent, child) {
  const self = this;
  self.parent = parent;
  self.child = child;
  self.undo = function () {
    self.child.parent = self.parent;
  };
  self.redo = function () {
    self.child.parent = undefined;
  };
}

// The main constructor for our GraphWorkspace
function GraphWorkspace(options) {
  const self = this;
  this.blocklistedNodes = [];
  this.options = options;
  this.undoLog = [];
  this.redoLog = [];

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
  this.changeHandler = options.changeHandler;
  const layoutController = options.layoutController;

  this.addUndoLogEntry = function (undoOperations) {
    self.undoLog.push(undoOperations);
    if (self.undoLog.length > 50) {
      //Remove the oldest
      self.undoLog.splice(0, 1);
    }
    self.redoLog = [];
  };

  this.undo = function () {
    const lastOps = this.undoLog.pop();
    if (lastOps) {
      this.stopLayout();
      this.redoLog.push(lastOps);
      lastOps.forEach((ops) => ops.undo());
      this.runLayout();
    }
  };
  this.redo = function () {
    const lastOps = this.redoLog.pop();
    if (lastOps) {
      this.stopLayout();
      this.undoLog.push(lastOps);
      lastOps.forEach((ops) => ops.redo());
      this.runLayout();
    }
  };

  //======== Selection functions ========

  this.deleteNodes = function (nodeIds) {
    const selectedNodes = nodeIds
      .map((nodeId) => self.nodesMap[nodeId])
      .filter((node) => node !== undefined);
    let allAndGrouped = self.returnUnpackedGroupeds(selectedNodes);

    // Nothing selected so process all nodes
    if (allAndGrouped.length === 0) {
      allAndGrouped = self.nodes.slice(0);
    }

    const undoOperations = [];
    allAndGrouped.forEach((node) => {
      delete self.nodesMap[node.id];
      undoOperations.push(new ReverseOperation(new AddNodeOperation(node, self)));
    });
    self.arrRemoveAll(self.nodes, allAndGrouped);

    const danglingEdges = self.edges.filter(function (edge) {
      return self.nodes.indexOf(edge.source) < 0 || self.nodes.indexOf(edge.target) < 0;
    });
    danglingEdges.forEach((edge) => {
      delete self.edgesMap[edge.id];
      undoOperations.push(new ReverseOperation(new AddEdgeOperation(edge, self)));
    });
    self.addUndoLogEntry(undoOperations);
    self.arrRemoveAll(self.edges, danglingEdges);
    self.runLayout();
  };

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

  // ======= Miscellaneous functions
  /**
   * @type void
   */
  this.clearGraph = function () {
    this.stopLayout();
    this.nodes = [];
    this.edges = [];
    this.undoLog = [];
    this.redoLog = [];
    this.nodesMap = {};
    this.edgesMap = {};
    this.blocklistedNodes = [];
  };

  this.arrRemoveAll = function remove(arr, items) {
    for (let i = items.length; i--; ) {
      self.arrRemove(arr, items[i]);
    }
  };

  this.arrRemove = function remove(arr, item) {
    for (let i = arr.length; i--; ) {
      if (arr[i] === item) {
        arr.splice(i, 1);
      }
    }
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

  //========Grouping functions==========

  //Merges all selected nodes into node
  this.groupNodes = function (parentId, nodeIds) {
    const node = self.nodesMap[parentId];
    const selectedNodeIds = new Set(nodeIds);
    const ops = [];
    self.nodes.forEach(function (otherNode) {
      if (
        otherNode !== node &&
        selectedNodeIds.has(otherNode.id) &&
        otherNode.parent === undefined
      ) {
        otherNode.parent = node;
        ops.push(new GroupOperation(node, otherNode));
      }
    });
    self.addUndoLogEntry(ops);
    self.runLayout();
  };

  this.ungroup = function (node) {
    const ops = [];
    self.nodes.forEach(function (other) {
      if (other.parent === node) {
        other.parent = undefined;
        ops.push(new UnGroupOperation(node, other));
      }
    });
    self.addUndoLogEntry(ops);
    self.runLayout();
  };

  this.unblockNode = function (node) {
    self.arrRemove(self.blocklistedNodes, node);
  };

  this.unblockAll = function () {
    self.arrRemoveAll(self.blocklistedNodes, self.blocklistedNodes);
  };

  this.blocklistNodes = function (nodeIds) {
    const selectedNodes = nodeIds
      .map((nodeId) => self.nodesMap[nodeId])
      .filter((node) => node !== undefined);
    const selection = self.returnUnpackedGroupeds(selectedNodes);
    const danglingEdges = [];
    self.edges.forEach(function (edge) {
      if (selection.indexOf(edge.source) >= 0 || selection.indexOf(edge.target) >= 0) {
        delete self.edgesMap[edge.id];
        danglingEdges.push(edge);
      }
    });
    selection.forEach((node) => {
      delete self.nodesMap[node.id];
      self.blocklistedNodes.push(node);
    });
    self.arrRemoveAll(self.nodes, selection);
    self.arrRemoveAll(self.edges, danglingEdges);
    self.runLayout();
  };

  this.makeNodeId = makeNodeId;

  this.makeEdgeId = makeEdgeId;

  //=======  Adds new nodes retrieved from an elasticsearch search ========
  this.mergeGraph = function (newData) {
    this.stopLayout();

    if (!newData.nodes) {
      newData.nodes = [];
    }
    const lastOps = [];

    // === Commented out - not sure it was obvious to users what various circle sizes meant
    // var minCircleSize = 5;
    // var maxCircleSize = 25;
    // var sizeScale = d3.scale.pow().exponent(0.15)
    //   .domain([0, d3.max(newData.nodes, function(d) {
    //     return d.weight;
    //   })])
    //   .range([minCircleSize, maxCircleSize]);

    //Remove nodes we already have
    const { normalizedNodes, newNodes } = prepareIncomingNodes(
      newData.nodes,
      new Set(Object.keys(this.nodesMap))
    );
    newData.nodes = normalizedNodes;
    if (newNodes.length > 0 && this.options.nodeLabeller) {
      // A hook for client code to attach labels etc to newly introduced nodes.
      this.options.nodeLabeller(newNodes);
    }

    newNodes.forEach((dedupedNode) => {
      const node = materializeRuntimeNode(dedupedNode, this.seqNumber++);
      this.nodes.push(node);
      lastOps.push(new AddNodeOperation(node, self));
      this.nodesMap[node.id] = node;
    });

    planIncomingEdges({
      edges: newData.edges,
      nodes: normalizedNodes,
      existingEdges: this.edgesMap,
    }).forEach((operation) => {
      if (operation.type === 'update') {
        const existingEdge = this.edgesMap[operation.id];
        existingEdge.weight = operation.weight;
        //TODO update width too?
        existingEdge.doc_count = operation.docCount;
        return;
      }

      const newEdge = materializeRuntimeEdge(operation, this.nodesMap);
      this.edgesMap[newEdge.id] = newEdge;
      this.edges.push(newEdge);
      lastOps.push(new AddEdgeOperation(newEdge, self));
    });

    if (lastOps.length > 0) {
      self.addUndoLogEntry(lastOps);
    }

    self.changeHandler?.();
    this.runLayout();
  };

  this.mergeIds = function (parentId, childId) {
    const parent = self.getNode(parentId);
    const child = self.getNode(childId);
    child.parent = parent;
    self.addUndoLogEntry([new GroupOperation(parent, child)]);
    self.runLayout();
  };

  this.getNode = function (nodeId) {
    return this.nodesMap[nodeId];
  };
}
//=====================

// Begin Kibana wrapper
export function createWorkspace(options) {
  return new GraphWorkspace(options);
}
