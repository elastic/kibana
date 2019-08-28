/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterMetadata } from './cluster_meta';
import { Repository } from '../../../model';
import { RoutingTable } from './routing_table';
import { ClusterState } from './cluster_state';
import { CodeNodes } from './code_nodes';

const repoCmpFunc = (a: Repository, b: Repository): number => {
  return a.url.localeCompare(b.url);
};

test('an empty routing table should be well defined', () => {
  // test an empty table
  const table = new RoutingTable([]);
  expect(table.nodeIds().length).toBe(0);
  expect(table.repositoryURIs().length).toBe(0);
  expect(table.getRepositoryURIsByNodeId('test').length).toBe(0);
});

test('basic functions of a simple routing table', () => {
  // test an empty table
  const table = new RoutingTable([
    { nodeId: 'n1', resource: 'r1' },
    { nodeId: 'n1', resource: 'r2' },
    { nodeId: 'n2', resource: 'r3' },
    { nodeId: 'n3', resource: 'r4' },
  ]);
  expect(table.nodeIds().length).toBe(3);
  expect(table.repositoryURIs().length).toBe(4);
  expect(table.getRepositoryURIsByNodeId('n1')).toEqual(['r1', 'r2']);
  expect(table.getRepositoryURIsByNodeId('n2')).toEqual(['r3']);
  expect(table.getRepositoryURIsByNodeId('n3')).toEqual(['r4']);
  expect(table.getRepositoryURIsByNodeId('n4').length).toBe(0);
});

test('cluster state functions', () => {
  const repositories: Repository[] = [
    { uri: 'github/a/a', url: 'http://github/a/a' },
    { uri: 'github/b/b', url: 'http://github/b/b' },
    { uri: 'github/c/c', url: 'http://github/c/c' },
  ];
  const state = new ClusterState(
    new ClusterMetadata(repositories),
    new RoutingTable([
      { nodeId: 'n1', resource: 'github/a/a' },
      { nodeId: 'n1', resource: 'github/b/b' },
      { nodeId: 'n2', resource: 'github/c/c' },
      // a non-exist repository
      { nodeId: 'n2', resource: 'github/d/d' },
    ]),
    new CodeNodes([])
  );

  let repos = state.getNodeRepositories('n0');
  expect(repos.length).toBe(0);

  repos = state.getNodeRepositories('n1');
  expect(repos).toBeDefined();
  expect(repos!.length).toBe(2);
  repos!.sort(repoCmpFunc);
  expect(repos![0].uri).toBe('github/a/a');
  expect(repos![1].uri).toBe('github/b/b');

  repos = state.getNodeRepositories('n2');
  expect(repos).toBeDefined();
  expect(repos!.length).toBe(1);
  expect(repos![0].uri).toBe('github/c/c');
});
