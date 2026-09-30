/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana wrapper
import { getIcon } from '../../helpers/style_choices';
import {
  makeEdgeId,
  makeNodeId,
  planIncomingEdges,
  prepareIncomingNodes,
} from './graph_merge_planner';
import { buildNodeQuery } from './graph_request_builders';

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
  this.lastRequest = null;
  this.lastResponse = null;
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

  //Determines if 2 nodes are connected via an edge
  this.areLinked = function (a, b) {
    if (a === b) return true;
    this.edges.forEach((e) => {
      if (e.source === a && e.target === b) {
        return true;
      }
      if (e.source === b && e.target === a) {
        return true;
      }
    });
    return false;
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
    this.lastResponse = null;
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

  this.getNeighbours = function (node) {
    const neighbourNodes = [];
    self.edges.forEach((edge) => {
      if (edge.topSrc === edge.topTarget) {
        return;
      }
      if (edge.topSrc === node) {
        if (neighbourNodes.indexOf(edge.topTarget) < 0) {
          neighbourNodes.push(edge.topTarget);
        }
      }
      if (edge.topTarget === node) {
        if (neighbourNodes.indexOf(edge.topSrc) < 0) {
          neighbourNodes.push(edge.topSrc);
        }
      }
    });
    return neighbourNodes;
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
      let label = dedupedNode.term;
      if (dedupedNode.label) {
        label = dedupedNode.label;
      }

      const node = {
        x: 1,
        y: 1,
        numChildren: 0,
        parent: undefined,
        id: dedupedNode.id,
        label: label,
        color: dedupedNode.color,
        icon: getIcon(dedupedNode.icon),
        data: dedupedNode,
      };
      //        node.scaledSize = sizeScale(node.data.weight);
      node.scaledSize = 15;
      node.seqNumber = this.seqNumber++;
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

      const newEdge = {
        source: this.nodesMap[operation.sourceId],
        target: this.nodesMap[operation.targetId],
        weight: operation.edge.weight,
        width: operation.edge.width,
        id: operation.id,
        doc_count: operation.edge.doc_count,
      };
      if (operation.edge.label) {
        newEdge.label = operation.edge.label;
      }

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
  this.getEdge = function (edgeId) {
    return this.edgesMap[edgeId];
  };

  this.trimExcessNewEdges = function (newNodes, newEdges) {
    let trimmedEdges = [];
    const maxNumEdgesToReturn = 5;
    //Trim here to just the new edges that are most interesting.
    newEdges.forEach((edge) => {
      const src = newNodes[edge.source];
      const target = newNodes[edge.target];
      const srcId = src.field + '..' + src.term;
      const targetId = target.field + '..' + target.term;
      const id = this.makeEdgeId(srcId, targetId);
      const existingSrcNode = self.nodesMap[srcId];
      const existingTargetNode = self.nodesMap[targetId];
      if (existingSrcNode != null && existingTargetNode != null) {
        if (existingSrcNode.parent !== undefined && existingTargetNode.parent !== undefined) {
          // both nodes are rolled-up and grouped so this edge would not be a visible
          // change to the graph - lose it in favour of any other visible ones.
          return;
        }
      } else {
        console.log('Error? Missing nodes ' + srcId + ' or ' + targetId, self.nodesMap);
        return;
      }

      const existingEdge = self.edgesMap[id];
      if (existingEdge) {
        existingEdge.weight = Math.max(existingEdge.weight, edge.weight);
        existingEdge.doc_count = Math.max(existingEdge.doc_count, edge.doc_count);
        return;
      } else {
        trimmedEdges.push(edge);
      }
    });
    if (trimmedEdges.length > maxNumEdgesToReturn) {
      //trim to only the most interesting ones
      trimmedEdges.sort(function (a, b) {
        return b.weight - a.weight;
      });
      trimmedEdges = trimmedEdges.splice(0, maxNumEdgesToReturn);
    }
    return trimmedEdges;
  };

  this.getQuery = function (startNodes, loose) {
    const shoulds = [];
    let nodes = startNodes;
    if (!startNodes) {
      nodes = self.nodes;
    }
    nodes.forEach((node) => {
      if (node.parent === undefined) {
        shoulds.push(buildNodeQuery(self.returnUnpackedGroupeds([node])));
      }
    });
    return {
      bool: {
        should: shoulds,
        minimum_should_match: Math.min(shoulds.length, loose ? 1 : 2),
      },
    };
  };

  function addTermToFieldList(map, field, term) {
    let arr = map[field];
    if (!arr) {
      arr = [];
      map[field] = arr;
    }
    arr.push(term);
  }

  /**
   * Add missing links between existing nodes
   * @param maxNewEdges Max number of new edges added. Avoid adding too many new edges
   * at once into the graph otherwise disorientating
   */
  // Provide a "fuzzy find similar" query that can find similar docs but preferably
  // not re-iterating the exact terms we already have in the workspace.
  // We use a free-text search on the index's configured default field (typically '_all')
  // to drill-down into docs that should be linked but aren't via the exact terms
  // we have in the workspace
  this.getLikeThisButNotThisQuery = function (startNodes) {
    const likeQueries = [];

    const txtsByFieldType = {};
    startNodes.forEach((node) => {
      let txt = txtsByFieldType[node.data.field];
      if (txt) {
        txt = txt + ' ' + node.label;
      } else {
        txt = node.label;
      }
      txtsByFieldType[node.data.field] = txt;
    });
    for (const field in txtsByFieldType) {
      if (Object.hasOwn(txtsByFieldType, field)) {
        likeQueries.push({
          more_like_this: {
            like: txtsByFieldType[field],
            min_term_freq: 1,
            minimum_should_match: '20%',
            min_doc_freq: 1,
            boost_terms: 2,
            max_query_terms: 25,
          },
        });
      }
    }

    const excludeNodesByField = {};
    const allExistingNodes = self.nodes;
    allExistingNodes.forEach((existingNode) => {
      addTermToFieldList(excludeNodesByField, existingNode.data.field, existingNode.data.term);
    });
    const blocklistedNodes = self.blocklistedNodes;
    blocklistedNodes.forEach((blocklistedNode) => {
      addTermToFieldList(
        excludeNodesByField,
        blocklistedNode.data.field,
        blocklistedNode.data.term
      );
    });

    //Create negative boosting queries to avoid matching what you already have in the workspace.
    const notExistingNodes = [];
    Object.keys(excludeNodesByField).forEach((fieldName) => {
      const termsQuery = {};
      termsQuery[fieldName] = excludeNodesByField[fieldName];
      notExistingNodes.push({
        terms: termsQuery,
      });
    });

    const result = {
      // Use a boosting query to effectively to request "similar to these IDS/labels but
      // preferably not containing these exact IDs".
      boosting: {
        negative_boost: 0.0001,
        negative: {
          bool: {
            should: notExistingNodes,
          },
        },
        positive: {
          bool: {
            should: likeQueries,
          },
        },
      },
    };
    return result;
  };
}
//=====================

// Begin Kibana wrapper
export function createWorkspace(options) {
  return new GraphWorkspace(options);
}
