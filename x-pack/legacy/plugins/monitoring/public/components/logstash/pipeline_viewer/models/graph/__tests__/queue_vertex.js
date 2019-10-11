/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { QueueVertex } from '../queue_vertex';
import { Vertex } from '../vertex';

describe('QueueVertex', () => {
  let graph;
  let vertexJson;

  beforeEach(() => {
    graph = {};
    vertexJson = {};
  });

  it('should be an instance of Vertex', () => {
    const queueVertex = new QueueVertex(graph, vertexJson);
    expect(queueVertex).to.be.a(Vertex);
  });

  it('should have a type of queue', () => {
    const queueVertex = new QueueVertex(graph, vertexJson);
    expect(queueVertex.typeString).to.be('queue');
  });
});
