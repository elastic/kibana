/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { bufferCount, take } from 'rxjs';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { CoreStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import type { GetElasticsearchAndSOAvailabilityOpts } from './get_es_and_so_availability';
import { getElasticsearchAndSOAvailability } from './get_es_and_so_availability';
import type { ClusterHealthHealthResponseBody } from '@elastic/elasticsearch/lib/api/types';

const logger = loggingSystemMock.createLogger();
const clusterClientMock = elasticsearchServiceMock.createClusterClient();
const getClusterClient = async () => clusterClientMock;

function getOpts(
  overwrites: Partial<GetElasticsearchAndSOAvailabilityOpts>
): GetElasticsearchAndSOAvailabilityOpts {
  return {
    core$: new Subject<CoreStatus>(),
    logger,
    getClusterClient,
    isServerless: false,
    ...overwrites,
  };
}

describe('getElasticsearchAndSOAvailability', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns false when elasticsearch isnt avialable, so is avialable and elasticsearch is healthy', async () => {
    const core$ = new Subject<CoreStatus>();
    clusterClientMock.asInternalUser.cluster.health.mockResolvedValue(healthyEsResponse);
    const availability = getElasticsearchAndSOAvailability(getOpts({ core$ }))
      .pipe(take(3), bufferCount(3))
      .toPromise();

    core$.next(mockCoreStatusAvailability({ elasticsearch: false, savedObjects: true }));

    expect(await availability).toEqual([false, false, false]);
    core$.complete();
  });

  test('returns false when so isnt available, elasticsearch is available and elasticsearch is healthy', async () => {
    const core$ = new Subject<CoreStatus>();
    clusterClientMock.asInternalUser.cluster.health.mockResolvedValue(healthyEsResponse);
    const availability = getElasticsearchAndSOAvailability(getOpts({ core$ }))
      .pipe(take(3), bufferCount(3))
      .toPromise();

    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: false }));

    expect(await availability).toEqual([false, false, false]);
    core$.complete();
  });

  test('returns true when both services are available and elasticsearch isnt healthy', async () => {
    const core$ = new Subject<CoreStatus>();
    clusterClientMock.asInternalUser.cluster.health.mockRejectedValue(
      new Error('Request timed out')
    );
    const availability = getElasticsearchAndSOAvailability(getOpts({ core$ }))
      .pipe(take(3), bufferCount(3))
      .toPromise();

    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

    expect(await availability).toEqual([false, false, true]);
    expect(logger.error).toHaveBeenCalledWith(
      'Error loading the cluster health. The task poller will start regardless. Error: Request timed out'
    );
    core$.complete();
  });

  test('returns true when both services are available and elasticsearch is healthy', async () => {
    const core$ = new Subject<CoreStatus>();
    clusterClientMock.asInternalUser.cluster.health.mockResolvedValue(healthyEsResponse);
    const availability = getElasticsearchAndSOAvailability(getOpts({ core$ }))
      .pipe(take(3), bufferCount(3))
      .toPromise();

    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

    expect(await availability).toEqual([false, false, true]);
    core$.complete();
  });

  test('shift back and forth between values as status changes', async () => {
    const core$ = new Subject<CoreStatus>();
    clusterClientMock.asInternalUser.cluster.health.mockResolvedValue(healthyEsResponse);
    const availability = getElasticsearchAndSOAvailability(getOpts({ core$ }))
      .pipe(take(5), bufferCount(5))
      .toPromise();

    // Let the health API response processing go first
    await new Promise((resolve) => setTimeout(resolve, 1));

    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: false }));
    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));
    core$.next(mockCoreStatusAvailability({ elasticsearch: false, savedObjects: false }));

    expect(await availability).toEqual([false, false, false, true, false]);
    core$.complete();
  });

  test('wait for health=green when serverless=true', async () => {
    const core$ = new Subject<CoreStatus>();
    clusterClientMock.asInternalUser.cluster.health.mockResolvedValue(healthyEsResponse);
    const availability = getElasticsearchAndSOAvailability(getOpts({ core$, isServerless: true }))
      .pipe(take(3), bufferCount(3))
      .toPromise();

    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

    expect(await availability).toEqual([false, false, true]);
    expect(clusterClientMock.asInternalUser.cluster.health).toHaveBeenCalledWith({
      wait_for_status: 'green',
      timeout: '30s',
      index: '.kibana_task_manager',
    });
    core$.complete();
  });

  test('wait for health=yellow when serverless=false', async () => {
    const core$ = new Subject<CoreStatus>();
    clusterClientMock.asInternalUser.cluster.health.mockResolvedValue(healthyEsResponse);
    const availability = getElasticsearchAndSOAvailability(getOpts({ core$, isServerless: false }))
      .pipe(take(3), bufferCount(3))
      .toPromise();

    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

    expect(await availability).toEqual([false, false, true]);
    expect(clusterClientMock.asInternalUser.cluster.health).toHaveBeenCalledWith({
      wait_for_status: 'yellow',
      timeout: '30s',
      index: '.kibana_task_manager',
    });
    core$.complete();
  });

  test('returns true when both services are available and elasticsearch cluster client fails to load', async () => {
    const core$ = new Subject<CoreStatus>();
    const availability = getElasticsearchAndSOAvailability(
      getOpts({ core$, getClusterClient: jest.fn().mockRejectedValue(new Error('Failed to load')) })
    )
      .pipe(take(3), bufferCount(3))
      .toPromise();

    core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

    expect(await availability).toEqual([false, false, true]);
    expect(logger.error).toHaveBeenCalledWith(
      'Error loading the cluster client to fetch cluster health. The task poller will start regardless. Error: Failed to load'
    );
    core$.complete();
  });
});

function mockCoreStatusAvailability({
  elasticsearch,
  savedObjects,
}: {
  elasticsearch: boolean;
  savedObjects: boolean;
}) {
  return {
    elasticsearch: {
      level: elasticsearch ? ServiceStatusLevels.available : ServiceStatusLevels.unavailable,
      summary: '',
    },
    savedObjects: {
      level: savedObjects ? ServiceStatusLevels.available : ServiceStatusLevels.unavailable,
      summary: '',
    },
  };
}

const healthyEsResponse: ClusterHealthHealthResponseBody = {
  cluster_name: 'elasticsearch',
  status: 'green',
  timed_out: false,
  number_of_nodes: 1,
  number_of_data_nodes: 1,
  active_primary_shards: 34,
  active_shards: 34,
  relocating_shards: 0,
  initializing_shards: 0,
  unassigned_shards: 0,
  unassigned_primary_shards: 0,
  delayed_unassigned_shards: 0,
  number_of_pending_tasks: 1,
  number_of_in_flight_fetch: 0,
  task_max_waiting_in_queue_millis: 0,
  active_shards_percent_as_number: 100,
};
