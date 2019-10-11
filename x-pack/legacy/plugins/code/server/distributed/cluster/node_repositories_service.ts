/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import util from 'util';
import { ClusterService, ClusterStateListener } from './cluster_service';
import { ClusterStateEvent } from './cluster_state_event';
import { ClusterMembershipService } from './cluster_membership_service';
import { CloneWorker } from '../../queue';
import { Repository, RepositoryUri, RepoState } from '../../../model';
import { Logger } from '../../log';

export class NodeRepositoriesService implements ClusterStateListener {
  // visible for test
  readonly localRepos = new Map<RepositoryUri, LocalRepository>();
  private readonly localNodeId = this.clusterMembershipService.localNode.id;

  constructor(
    private readonly log: Logger,
    private readonly clusterService: ClusterService,
    private readonly clusterMembershipService: ClusterMembershipService,
    private readonly cloneWorker: CloneWorker
  ) {}

  public async start() {
    /**
     * we can add locally exists repositories to localRepos when the service is started to avoid unnecessarily add clone
     * tasks for them, but for now it's OK because clone job is idempotent.
     */
    this.clusterService.addClusterStateListener(this);
  }

  public async stop() {}

  async onClusterStateChanged(event: ClusterStateEvent): Promise<void> {
    // compare repositories in the cluster state with repositories in the local node, and remove
    const repos = event.current.getNodeRepositories(this.clusterMembershipService.localNode.id);
    const localNewRepos = repos.filter(repo => !this.localRepos.has(repo.uri));
    const localRemovedRepos = Array.from(this.localRepos.values()).filter(
      repo =>
        event.current.routingTable.getNodeIdByRepositoryURI(repo.metadata.uri) !== this.localNodeId
    );
    for (const localNewRepo of localNewRepos) {
      this.log.info(
        `Repository added to node [${this.localNodeId}]: ${util.inspect(localNewRepo)}`
      );
      await this.cloneWorker.enqueueJob({ url: localNewRepo.url }, {});
      this.localRepos.set(localNewRepo.uri, {
        metadata: localNewRepo,
        currentState: RepoState.CLONING,
      });
    }
    // TODO remove the stale local repo after the Kibana HA is ready
    for (const localRemovedRepo of localRemovedRepos) {
      this.log.info(
        `Repository removed from node [${this.localNodeId}]: ${util.inspect(
          localRemovedRepo.metadata
        )}`
      );
      this.localRepos.delete(localRemovedRepo.metadata.uri);
    }
  }
}

interface LocalRepository {
  metadata: Repository;
  currentState: RepoState;
}
