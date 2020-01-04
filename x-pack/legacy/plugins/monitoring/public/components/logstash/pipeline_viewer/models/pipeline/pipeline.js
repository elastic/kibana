/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { makeStatement } from './make_statement';
import { QueueVertex } from '../graph/queue_vertex';
import { isVertexPipelineStage } from './utils';

function getInputStatements(pipelineGraph) {
  return pipelineGraph
    .getVertices()
    .filter(v => v.pipelineStage === 'input')
    .map(makeStatement);
}

function isFilterStageVertex(vertex) {
  return vertex.pipelineStage === 'filter';
}

function isVertexOrphan(vertex) {
  return vertex.incomingVertices.length === 0;
}

function isVertexChildOfQueue(vertex) {
  return vertex.incomingVertices.every(p => p instanceof QueueVertex);
}

function getFilterStatements(pipelineGraph) {
  // If the graph has a Queue vertex, then the first filter vertex whose parent is the Queue vertex
  // is where we want to start. If there is no Queue vertex then there are necessarily no input-stage vertices
  // either, so the first filter vertex that has no parents (orphan vertex) is where we want to start.
  const allVertices = pipelineGraph.getVertices();
  const allFilterVertices = allVertices.filter(v => isFilterStageVertex(v));
  const startFilterVertex = pipelineGraph.hasQueueVertex
    ? allFilterVertices.find(v => isVertexChildOfQueue(v))
    : allFilterVertices.find(v => isVertexOrphan(v));

  if (!startFilterVertex) {
    return [];
  }

  const filterStatements = [];
  let currentVertex = startFilterVertex;
  while (isVertexPipelineStage(currentVertex, 'filter')) {
    filterStatements.push(makeStatement(currentVertex, 'filter'));
    currentVertex = currentVertex.next;
  }

  return filterStatements;
}

function getQueue(pipelineGraph) {
  return pipelineGraph.hasQueueVertex ? makeStatement(pipelineGraph.queueVertex) : null;
}

function getOutputStatements(pipelineGraph) {
  return pipelineGraph
    .getVertices()
    .filter(
      v =>
        v.pipelineStage === 'output' && !v.incomingVertices.some(p => p.pipelineStage === 'output')
    )
    .map(v => makeStatement(v, 'output'));
}

export class Pipeline {
  constructor(inputStatements, filterStatements, outputStatements, queue) {
    this.inputStatements = inputStatements;
    this.filterStatements = filterStatements;
    this.outputStatements = outputStatements;
    this.queue = queue;
  }

  static fromPipelineGraph(pipelineGraph) {
    // Determine input statements, if any
    const inputStatements = getInputStatements(pipelineGraph);

    // Determine filter statements, if any
    const filterStatements = getFilterStatements(pipelineGraph);

    // Determine output statements, if any
    const outputStatements = getOutputStatements(pipelineGraph);

    // Create queue, if exists
    const queue = getQueue(pipelineGraph);

    return new Pipeline(inputStatements, filterStatements, outputStatements, queue);
  }
}
