/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import util from 'util';
import { ClusterMetadata } from './cluster_meta';
import { EsClient } from '../../lib/esqueue';
import { RepositoryObjectClient } from '../../search';
import { Poller } from '../../poller';
import { Logger } from '../../log';
import { ClusterState } from './cluster_state';
import { ClusterStateEvent } from './cluster_state_event';

/**
 * ClusterService synchronizes the core cluster states with the remote, and provides methods to read the current state,
 * and to register listeners to watch the state change.
 */
export class ClusterService {
  private readonly clusterStateListeners: ClusterStateListener[] = [];
  private readonly clusterStatePoller = new Poller<void>({
    functionToPoll: () => {
      return this.pollClusterState();
    },
    pollFrequencyInMillis: 5000,
    trailing: true,
    continuePollingOnError: true,
  });

  private currentState: ClusterState = ClusterState.empty();

  constructor(
    public readonly esClient: EsClient,
    public readonly logger: Logger,
    private readonly repositoryObjectClient: RepositoryObjectClient = new RepositoryObjectClient(
      esClient
    )
  ) {}

  public async start() {
    this.clusterStatePoller.start();
  }

  public async stop() {
    this.clusterStatePoller.stop();
  }

  /**
   * Sync the cluster meta-data with the remote storage.
   */
  async pollClusterState(): Promise<void> {
    const repos = await this.repositoryObjectClient.getAllRepositories();
    const repoUris = new Set(repos.map(repo => repo.uri));
    const currentRepoUris = new Set(
      this.currentState.clusterMeta.repositories.map(repo => repo.uri)
    );
    const added = new Set(Array.from(repoUris).filter(uri => !currentRepoUris.has(uri)));
    const removed = new Set(Array.from(currentRepoUris).filter(uri => !repoUris.has(uri)));
    if (added.size === 0 && removed.size === 0) {
      // the cluster state and the routing table is only needed to be updated when repository objects have changed.
      return;
    }
    this.setClusterState(
      new ClusterState(
        new ClusterMetadata(repos),
        this.currentState.routingTable.withoutRepositories(removed),
        this.currentState.nodes
      )
    );
  }

  public state(): ClusterState {
    return this.currentState;
  }

  public addClusterStateListener(applier: ClusterStateListener) {
    this.clusterStateListeners.push(applier);
  }

  private async callClusterStateListeners(event: ClusterStateEvent) {
    for (const applier of this.clusterStateListeners) {
      try {
        await applier.onClusterStateChanged(event);
      } catch (e) {
        this.logger.error(`Failed to apply cluster state ${util.inspect(event)}`);
      }
    }
  }

  /**
   * Set the local in memory cluster state, and call cluster state listeners if the state has been changed.
   *
   * @param newState is the new cluster state to set.
   */
  public setClusterState(newState: ClusterState): ClusterStateEvent | undefined {
    if (newState === this.currentState) {
      return undefined;
    }
    const event = new ClusterStateEvent(newState, this.currentState);
    this.currentState = newState;
    setTimeout(async () => {
      this.callClusterStateListeners(event);
    });

    return event;
  }

  /**
   * Invoke the updater with the current cluster state as the parameter, and write the result of the updater to remote
   * as the new cluster state, if the current local cluster state matches the current remote cluster state, otherwise
   * the updater should be executed again, with the most recent remote cluster state as the input.
   * It means the method works as a series of CAS operations, until the first success operation.
   * It also means the updater should be side-effect free.
   */
  public async updateClusterState(
    updater: ClusterStateUpdater
  ): Promise<ClusterStateEvent | undefined> {
    const newState = updater(this.currentState);
    return this.setClusterState(newState);
  }
}

/**
 * A cluster applier is a listener of cluster state event.
 */
export interface ClusterStateListener {
  onClusterStateChanged(event: ClusterStateEvent): Promise<void>;
}

export type ClusterStateUpdater = (state: ClusterState) => ClusterState;
