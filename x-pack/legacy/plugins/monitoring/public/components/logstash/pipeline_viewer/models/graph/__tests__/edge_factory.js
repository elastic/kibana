/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { edgeFactory } from '../edge_factory';
import { Edge } from '../edge';
import { BooleanEdge } from '../boolean_edge';

describe('edgeFactory', () => {
  let graph;
  let edgeJson;

  beforeEach(() => {
    graph = {
      verticesById: {
        mygenerator: {},
        myqueue: {}
      }
    };
    edgeJson = {
      id: 12345,
      from: 'mygenerator',
      to: 'myqueue'
    };
  });

  it('returns an Edge when edge type is plain', () => {
    edgeJson.type = 'plain';
    expect(edgeFactory(graph, edgeJson)).to.be.a(Edge);
  });

  it('returns a BooleanEdge when edge type is boolean', () => {
    edgeJson.type = 'boolean';
    expect(edgeFactory(graph, edgeJson)).to.be.a(BooleanEdge);
  });

  it('throws an error when edge type is unknown', () => {
    edgeJson.type = 'foobar';
    const fn = () => edgeFactory(graph, edgeJson);
    expect(fn).to.throwError();
  });
});
