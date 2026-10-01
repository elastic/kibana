/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asKQL } from './kql_encoder';
import type { RuntimeWorkspace, WorkspaceNode } from '../types';

const createNode = (id: string, field: string, term: string) =>
  ({ id, data: { field, term } } as WorkspaceNode);

describe('kql_encoder', () => {
  let workspaceMock: RuntimeWorkspace;

  beforeEach(() => {
    const nodes = [
      createNode('1', 'fieldA', 'term1'),
      createNode('2', 'fieldA', 'term2'),
      createNode('3', 'fieldB', 'term1'),
    ];
    workspaceMock = {
      nodes,
      edges: [],
      nodesMap: Object.fromEntries(nodes.map((node) => [node.id, node])),
    } as unknown as RuntimeWorkspace;
  });

  it('should encode query as URI component', () => {
    expect(asKQL(workspaceMock, [], 'and')).toEqual(
      "'%22fieldA%22%20%3A%20%22term1%22%20and%20%22fieldA%22%20%3A%20%22term2%22%20and%20%22fieldB%22%20%3A%20%22term1%22'"
    );
  });

  it('should encode nodes as or query', () => {
    expect(decodeURIComponent(asKQL(workspaceMock, [], 'or'))).toEqual(
      `'"fieldA" : "term1" or "fieldA" : "term2" or "fieldB" : "term1"'`
    );
  });

  it('should encode nodes as and query', () => {
    expect(decodeURIComponent(asKQL(workspaceMock, [], 'and'))).toEqual(
      `'"fieldA" : "term1" and "fieldA" : "term2" and "fieldB" : "term1"'`
    );
  });

  it('uses explicit selected node IDs', () => {
    expect(decodeURIComponent(asKQL(workspaceMock, ['2'], 'and'))).toEqual(`'"fieldA" : "term2"'`);
  });

  it('should escape quotes in field names', () => {
    const node = createNode('quote', 'a"b', 'term1');
    workspaceMock.nodes = [node];
    workspaceMock.nodesMap = { quote: node };
    expect(decodeURIComponent(asKQL(workspaceMock, [], 'and'))).toEqual(`'"a\\"b" : "term1"'`);
  });

  it('should escape quotes in terms', () => {
    const node = createNode('quote', 'fieldA', 'term"1');
    workspaceMock.nodes = [node];
    workspaceMock.nodesMap = { quote: node };
    expect(decodeURIComponent(asKQL(workspaceMock, [], 'and'))).toEqual(`'"fieldA" : "term\\"1"'`);
  });
});
