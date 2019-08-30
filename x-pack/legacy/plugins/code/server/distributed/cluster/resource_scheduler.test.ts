/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HashSchedulePolicy } from './hash_schedule_policy';
import { RoutingTable } from './routing_table';
import { CodeNode, CodeNodes } from './code_nodes';
import { ResourceScheduler } from './resource_scheduler';
import { Logger } from '../../log';
import { ConsoleLoggerFactory } from '../../utils/console_logger_factory';
import { ClusterState } from './cluster_state';
import { ClusterMetadata } from './cluster_meta';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

function randStr() {
  return Math.random()
    .toString(36)
    .substr(2, 9);
}

test('test hash schedule policy', () => {
  const nodeA = { id: 'na', address: 'http://a' } as CodeNode;
  const nodeB = { id: 'nb', address: 'http://b' } as CodeNode;
  const nodeC = { id: 'nc', address: 'http://c' } as CodeNode;

  const policy = new HashSchedulePolicy();
  const rt = new RoutingTable();

  // can allocate only when any node exists
  expect(policy.canAllocate('ra', rt, new CodeNodes([]))).toBeFalsy();
  expect(policy.canAllocate('ra', rt, new CodeNodes([nodeA]))).toBeTruthy();

  // can allocate when the node id matches
  expect(policy.canAllocateOnNode('ra', nodeB, rt, new CodeNodes([nodeA]))).toBeFalsy();
  expect(policy.canAllocateOnNode('ra', nodeA, rt, new CodeNodes([nodeA]))).toBeTruthy();

  const nodes1 = new CodeNodes([nodeA, nodeB, nodeC]);
  const nodes2 = new CodeNodes([nodeB, nodeA, nodeC]);
  const nodes3 = new CodeNodes([nodeB, nodeC, nodeA]);

  // always can only be allocated on one of the nodes
  for (let i = 0; i < 100; i++) {
    const resName = randStr();
    let target: CodeNode | undefined;
    for (const nodes of [nodes1, nodes2, nodes3]) {
      let num = 0;
      for (const node of nodes.nodes) {
        if (policy.canAllocateOnNode(resName, node, rt, nodes)) {
          num++;
          if (target) {
            // sequence of the nodes doesn't matter
            expect(node).toBe(target);
          } else {
            target = node;
          }
        }
      }
      expect(num).toBe(1);
    }
  }
});

test('hash based resource allocation', () => {
  const scheduler = new ResourceScheduler([new HashSchedulePolicy()], log);

  const rt = new RoutingTable();
  let state = ClusterState.empty();
  const resources = ['ra', 'tb'];

  let assignments = scheduler.allocate(resources, state);
  expect(assignments.length).toBe(0);

  let nodes = new CodeNodes([{ id: 'na', address: 'http://a' }]);
  state = new ClusterState(new ClusterMetadata(), rt, nodes);
  assignments = scheduler.allocate(resources, state);

  expect(assignments.length).toBe(resources.length);

  nodes = new CodeNodes([{ id: 'na', address: 'http://a' }, { id: 'nb', address: 'http://b' }]);
  state = new ClusterState(new ClusterMetadata(), rt, nodes);
  for (let i = 0; i < 10; i++) {
    resources.push(randStr());
    assignments = scheduler.allocate(resources, state);
    expect(assignments.length).toBe(resources.length);
  }
});
