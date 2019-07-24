/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Edge {
  constructor(graph, json) {
    this.graph = graph;
    this.update(json);
  }

  update(json) {
    this.json = json;
  }

  get id() {
    return this.json.id;
  }

  get from() {
    return this.graph.verticesById[this.fromId];
  }

  get fromId() {
    return this.json.from;
  }

  get to() {
    return this.graph.verticesById[this.toId];
  }

  get toId() {
    return this.json.to;
  }
}
