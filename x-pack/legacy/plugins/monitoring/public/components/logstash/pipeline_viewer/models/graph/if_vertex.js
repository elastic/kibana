/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { intersection } from 'lodash';
import { Vertex } from './vertex';

export class IfVertex extends Vertex {
  get typeString() {
    return 'if';
  }

  get name() {
    return this.json.condition;
  }

  get iconType() {
    return 'logstashIf';
  }

  get title() {
    return 'if';
  }

  get subtitle() {
    return this.name;
  }

  get trueEdge() {
    return this.outgoingEdges.find(e => e.when === true);
  }

  get trueEdges() {
    return this.outgoingEdges.filter(e => e.when === true);
  }

  get falseEdge() {
    return this.outgoingEdges.find(e => e.when === false);
  }

  get falseEdges() {
    return this.outgoingEdges.filter(e => e.when === false);
  }

  get trueOutgoingVertex() {
    return this.trueEdge ? this.trueEdge.to : null;
  }

  get trueOutgoingVertices() {
    return this.trueEdges.map(e => e.to);
  }

  get falseOutgoingVertex() {
    return this.falseEdge ? this.falseEdge.to : null;
  }

  get falseOutgoingVertices() {
    return this.falseEdges.map(e => e.to);
  }

  get next() {
    const trueDescendants = this.trueOutgoingVertex
      ? this.trueOutgoingVertex.descendants().vertices
      : [];
    const falseDescendants = this.falseOutgoingVertex
      ? this.falseOutgoingVertex.descendants().vertices
      : [];

    trueDescendants.unshift(this.trueOutgoingVertex);
    falseDescendants.unshift(this.falseOutgoingVertex);

    return intersection(trueDescendants, falseDescendants)[0];
  }
}
