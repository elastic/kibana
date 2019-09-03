/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterService } from './cluster_service';
import { Logger } from '../../log';
import { ConsoleLoggerFactory } from '../../utils/console_logger_factory';
import { EsClient } from '../../lib/esqueue';
import { RepositoryObjectClient } from '../../search';
import { Repository } from '../../../model';
import sinon from 'sinon';
import { ResourceSchedulerService } from './resource_scheduler_service';
import { ClusterState } from './cluster_state';
import { ClusterMetadata } from './cluster_meta';
import { RoutingTable } from './routing_table';
import { CodeNodes } from './code_nodes';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

afterEach(() => {
  sinon.restore();
});

test('test poll cluster state', async () => {
  const esClient = {} as EsClient;
  const repoClient = {} as RepositoryObjectClient;
  repoClient.getAllRepositories = sinon.fake.returns([
    {
      uri: 'github/a/a',
      url: 'http://github/a/a',
    } as Repository,
  ]);
  const clusterService = new ClusterService(esClient, log, repoClient);
  clusterService.setClusterState(
    new ClusterState(
      new ClusterMetadata(),
      new RoutingTable(),
      new CodeNodes([{ id: 'test', address: 'localhost' }])
    )
  );

  let state = clusterService.state();
  expect(state).toBeDefined();
  expect(state.clusterMeta.repositories.length).toBe(0);
  expect(state.routingTable.nodeIds().length).toBe(0);
  expect(state.routingTable.repositoryURIs().length).toBe(0);

  await clusterService.pollClusterState();
  const schedulerService: ResourceSchedulerService = new ResourceSchedulerService(
    clusterService,
    log
  );
  await schedulerService.allocateUnassigned();

  state = clusterService.state();
  expect(state).toBeDefined();
  expect(state.clusterMeta.repositories.length).toBe(1);
  const repo = state.clusterMeta.getRepository('github/a/a');
  expect(repo).toBeDefined();
  expect(repo!.url).toBe('http://github/a/a');
  expect(state.routingTable.getRepositoryURIsByNodeId('test')).toEqual(['github/a/a']);

  repoClient.getAllRepositories = sinon.fake.returns([]);
  await clusterService.pollClusterState();
  state = clusterService.state();
  expect(state).toBeDefined();
  expect(state.clusterMeta.repositories.length).toBe(0);
  expect(state.routingTable.repositoryURIs().length).toBe(0);
});
