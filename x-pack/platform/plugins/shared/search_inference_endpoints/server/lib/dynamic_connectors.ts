/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Observable, type Subscription, of } from 'rxjs';
import * as Rx from 'rxjs';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  PluginStartContract as ActionsPluginStartContract,
  InMemoryConnector,
} from '@kbn/actions-plugin/server';
import type {
  InferenceGetResponse,
  InferenceInferenceEndpointInfo,
} from '@elastic/elasticsearch/lib/api/types';
import { PLUGIN_ID } from '../../common/constants';
import {
  connectorFromEndpoint,
  filterPreconfiguredEndpoints,
  findEndpointsWithoutConnectors,
  findStaleDynamicConnectorIds,
} from '../utils/in_memory_connectors';

interface DynamicConnectorSync {
  connectorsToAdd: InMemoryConnector[];
  connectorIdsToRemove: string[];
}

export class DynamicConnectorsPoller {
  private readonly logger: Logger;
  private readonly client: ElasticsearchClient;
  private readonly actions: ActionsPluginStartContract;
  private readonly pollingIntervalMs: number;
  private readonly polling$: Observable<unknown>;
  private subscription: Subscription | undefined;

  constructor(
    logger: Logger,
    actions: ActionsPluginStartContract,
    client: ElasticsearchClient,
    pollingIntervalMins: number
  ) {
    this.logger = logger.get(PLUGIN_ID, 'DynamicConnectorsPoller');
    this.client = client;
    this.actions = actions;
    this.pollingIntervalMs = pollingIntervalMins * 60 * 1000;

    this.polling$ = this.createPollingObservable();
  }

  public start() {
    if (this.subscription) {
      this.logger.warn('start called when already running');
      return;
    }

    this.subscription = this.polling$.subscribe();
    this.logger.debug('polling started');
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.logger.debug('polling stopped');
      this.subscription = undefined;
    }
  }

  private createPollingObservable() {
    return of({}).pipe(
      Rx.tap(this.pollBegin.bind(this)),
      Rx.mergeMap(this.fetchInferenceEndpoints.bind(this)),
      Rx.map(this.handleInferenceEndpointsResponse.bind(this)),
      Rx.map(filterPreconfiguredEndpoints),
      Rx.map(this.resolveDynamicConnectorSync.bind(this)),
      Rx.tap(this.applyDynamicConnectorSync.bind(this)),
      Rx.delay(this.pollingIntervalMs),
      Rx.repeat(),
      Rx.catchError(this.handleError.bind(this)),
      Rx.retry({
        delay: this.pollingIntervalMs,
      })
    );
  }

  private pollBegin() {
    this.logger.debug('Polling inference endpoints for dynamic connectors...');
  }

  private fetchInferenceEndpoints() {
    return Rx.from(this.client.inference.get());
  }

  private handleInferenceEndpointsResponse(
    response: InferenceGetResponse
  ): InferenceInferenceEndpointInfo[] {
    if (response.endpoints) {
      return response.endpoints;
    }
    throw response;
  }

  private resolveDynamicConnectorSync(
    preconfiguredEISEndpoints: InferenceInferenceEndpointInfo[]
  ): DynamicConnectorSync {
    const inMemoryConnectors = [...this.actions.inMemoryConnectors];
    const inferenceEndpointsWithoutConnectors = findEndpointsWithoutConnectors(
      preconfiguredEISEndpoints,
      inMemoryConnectors
    );
    const connectorIdsToRemove = findStaleDynamicConnectorIds(
      preconfiguredEISEndpoints,
      inMemoryConnectors
    );

    return {
      connectorsToAdd: inferenceEndpointsWithoutConnectors.map(connectorFromEndpoint),
      connectorIdsToRemove,
    };
  }

  private applyDynamicConnectorSync({
    connectorsToAdd,
    connectorIdsToRemove,
  }: DynamicConnectorSync) {
    if (connectorsToAdd.length > 0) {
      this.logger.debug(
        `Found ${connectorsToAdd.length} preconfigured EIS endpoints to register as inMemoryConnectors`
      );
      for (const connector of connectorsToAdd) {
        this.actions.registerDynamicConnector(connector);
      }
    }
    if (connectorIdsToRemove.length > 0) {
      this.logger.debug(
        `Found ${connectorIdsToRemove.length} stale dynamic connectors to unregister`
      );
      for (const connectorId of connectorIdsToRemove) {
        this.actions.unregisterDynamicConnector(connectorId);
      }
    }
  }

  private handleError(error: unknown, _caught$: Observable<unknown>): Observable<never> {
    this.logger.error(`Error polling inference endpoints for dynamic connectors.`);
    if (Error.isError(error)) {
      this.logger.error(error);
    } else if (typeof error === 'object') {
      this.logger.error(JSON.stringify(error));
    }
    return Rx.throwError(() => error);
  }
}
