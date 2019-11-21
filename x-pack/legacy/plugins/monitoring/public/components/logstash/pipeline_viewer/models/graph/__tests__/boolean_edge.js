/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { BooleanEdge } from '../boolean_edge';
import { Edge } from '../edge';

describe('BooleanEdge', () => {
  let graph;
  let edgeJson;

  beforeEach(() => {
    graph = {
      verticesById: {
        myif: {},
        myes: {}
      }
    };
    edgeJson = {
      id: 'abcdef',
      from: 'myif',
      to: 'myes',
      when: true
    };
  });

  it('should be an instance of Edge', () => {
    const booleanEdge = new BooleanEdge(graph, edgeJson);
    expect(booleanEdge).to.be.a(Edge);
  });
});
