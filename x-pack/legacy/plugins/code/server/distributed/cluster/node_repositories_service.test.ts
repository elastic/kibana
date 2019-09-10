/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { Logger } from '../../log';
import { ConsoleLoggerFactory } from '../../utils/console_logger_factory';
import { NodeRepositoriesService } from './node_repositories_service';
import { ClusterService } from './cluster_service';
import { ClusterMembershipService } from './cluster_membership_service';
import { CodeNode, CodeNodes } from './code_nodes';
import { emptyAsyncFunc } from '../../test_utils';
import { CloneWorker } from '../../queue';
import { ClusterStateEvent } from './cluster_state_event';
import { ClusterState } from './cluster_state';
import { ClusterMetadata } from './cluster_meta';
import { Repository } from '../../../model';
import { ResourceAssignment, RoutingTable } from './routing_table';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

afterEach(() => {
  sinon.restore();
});

const cloneWorker = ({
  enqueueJob: emptyAsyncFunc,
} as any) as CloneWorker;

const clusterService = {} as ClusterService;

const testNodes = [
  { id: 'node1', address: 'http://node1' } as CodeNode,
  { id: 'node2', address: 'http://node2' } as CodeNode,
];

const testRepos = [
  { uri: 'test1', url: 'http://test1' } as Repository,
  { uri: 'test2', url: 'http://test2' } as Repository,
];

test('Enqueue clone job after new repository is added to the local node', async () => {
  const enqueueJobSpy = sinon.spy(cloneWorker, 'enqueueJob');

  const clusterMembershipService = {
    localNode: testNodes[0],
  } as ClusterMembershipService;

  const nodeService = new NodeRepositoriesService(
    log,
    clusterService,
    clusterMembershipService,
    cloneWorker
  );

  // event with no new repositories
  let event = new ClusterStateEvent(ClusterState.empty(), ClusterState.empty());
  await nodeService.onClusterStateChanged(event);
  expect(enqueueJobSpy.called).toBeFalsy();
  expect(nodeService.localRepos.size).toBe(0);

  // event with a new repository
  event = new ClusterStateEvent(
    new ClusterState(
      new ClusterMetadata([testRepos[0]]),
      new RoutingTable([
        { nodeId: testNodes[0].id, resource: testRepos[0].uri } as ResourceAssignment,
      ]),
      new CodeNodes([testNodes[0]])
    ),
    event.current
  );
  await nodeService.onClusterStateChanged(event);
  expect(enqueueJobSpy.calledOnce).toBeTruthy();
  expect(nodeService.localRepos.size).toBe(1);

  // event with removed repository
  event = new ClusterStateEvent(ClusterState.empty(), event.current);
  await nodeService.onClusterStateChanged(event);
  expect(enqueueJobSpy.calledOnce).toBeTruthy();
  expect(nodeService.localRepos.size).toBe(0);

  // event with two added repositories
  event = new ClusterStateEvent(
    new ClusterState(
      new ClusterMetadata([testRepos[0], testRepos[1]]),
      new RoutingTable([
        { nodeId: testNodes[0].id, resource: testRepos[0].uri } as ResourceAssignment,
        { nodeId: testNodes[0].id, resource: testRepos[1].uri } as ResourceAssignment,
      ]),
      new CodeNodes([testNodes[0]])
    ),
    event.current
  );
  await nodeService.onClusterStateChanged(event);
  expect(enqueueJobSpy.callCount).toBe(3);
  expect(nodeService.localRepos.size).toBe(2);

  // event with removed repository
  event = new ClusterStateEvent(ClusterState.empty(), event.current);
  await nodeService.onClusterStateChanged(event);
  expect(enqueueJobSpy.callCount).toBe(3);
  expect(nodeService.localRepos.size).toBe(0);

  // event with two added repositories, one for the other node
  event = new ClusterStateEvent(
    new ClusterState(
      new ClusterMetadata([testRepos[0], testRepos[1]]),
      new RoutingTable([
        { nodeId: testNodes[0].id, resource: testRepos[0].uri } as ResourceAssignment,
        { nodeId: testNodes[1].id, resource: testRepos[1].uri } as ResourceAssignment,
      ]),
      new CodeNodes([testNodes[0]])
    ),
    event.current
  );
  await nodeService.onClusterStateChanged(event);
  expect(enqueueJobSpy.callCount).toBe(4);
  expect(nodeService.localRepos.size).toBe(1);
});
