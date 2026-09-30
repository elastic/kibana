/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { fromPromise } from 'xstate';
import { TABLE_URL_STATE_KEY } from '../../../../../common/url_schema';
import {
  createEntityTableMachine,
  createEntityTableMachineImplementations,
  type EntityTableImplementations,
  type EntityTableUrlState,
} from '../../entity_table';
import { isDestinationStream, streamToDestination } from '../stream_to_destination';
import type { Destination } from '../types';

export const destinationsTableMachine = createEntityTableMachine<Destination>();

export const DESTINATIONS_TABLE_DEFAULT_URL_STATE: EntityTableUrlState = {
  query: '',
  sortField: 'name',
  sortDirection: 'asc',
  pageIndex: 0,
  pageSize: 25,
};

export interface DestinationsTableServiceDeps {
  core: CoreStart;
  urlStateStorageContainer: IKbnUrlStateStorage;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export function createDestinationsTableImplementations({
  core,
  urlStateStorageContainer,
  streamsRepositoryClient,
}: DestinationsTableServiceDeps): EntityTableImplementations<Destination> {
  return createEntityTableMachineImplementations<Destination>({
    core,
    urlStateStorageContainer,
    urlStateKey: TABLE_URL_STATE_KEY,
    defaultUrlState: DESTINATIONS_TABLE_DEFAULT_URL_STATE,
    fetchItems: fromPromise(async ({ signal }) => {
      // `GET /internal/streams/classic` returns definitions only; this list
      // payload includes lifecycle, data_stream, and failure-store privileges.
      const response = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });

      return response.streams.filter(isDestinationStream).map(streamToDestination);
    }),
  });
}
