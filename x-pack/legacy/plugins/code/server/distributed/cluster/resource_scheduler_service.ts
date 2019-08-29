/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ClusterService, ClusterStateListener } from './cluster_service';
import { ClusterStateEvent } from './cluster_state_event';
import { ClusterState } from './cluster_state';
import { ResourceScheduler } from './resource_scheduler';
import { Logger } from '../../log';
import { HashSchedulePolicy } from './hash_schedule_policy';

/**
 * This service watches the change of the cluster state and allocates resources to nodes if needed:
 * - when a new resource is added to the cluster
 * - a resource is unassigned, e.g., due to disk watermark constraints
 * - when a node is removed from the cluster (HA)
 */
export class ResourceSchedulerService implements ClusterStateListener {
  private readonly scheduler = new ResourceScheduler([new HashSchedulePolicy()], this.log);

  constructor(private readonly clusterService: ClusterService, private readonly log: Logger) {
    this.clusterService.addClusterStateListener(this);
  }

  public async start() {}

  public async stop() {}

  public async allocateUnassigned(state?: ClusterState) {
    if (!state) {
      state = this.clusterService.state();
    }
    const unassignedRepos = state.getUnassignedRepositories();
    if (_.isEmpty(unassignedRepos)) {
      return;
    }
    await this.clusterService.updateClusterState(current => {
      // sort repositories by names to make the allocation result stable
      const unassigned = current
        .getUnassignedRepositories()
        .map(repo => repo.uri)
        .sort();

      const assignments = this.scheduler.allocate(unassigned, current);
      if (_.isEmpty(assignments)) {
        return current;
      }
      return new ClusterState(
        current.clusterMeta,
        current.routingTable.assign(assignments),
        current.nodes
      );
    });
  }

  async onClusterStateChanged(event: ClusterStateEvent): Promise<void> {
    await this.allocateUnassigned(event.current);
  }
}
