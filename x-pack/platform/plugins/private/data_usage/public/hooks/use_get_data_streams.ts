/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { DataStreamsResponseBodySchemaBody } from '../../common/rest_types';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE, DEFAULT_SELECTED_OPTIONS } from '../../common';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

type GetDataUsageDataStreamsResponse = Array<
  DataStreamsResponseBodySchemaBody[number] & {
    selected: boolean;
  }
>;

export const useGetDataUsageDataStreams = ({
  selectedDataStreams,
  options = {
    enabled: false,
  },
}: {
  selectedDataStreams?: string[];
  options?: UseQueryOptions<GetDataUsageDataStreamsResponse, IHttpFetchError>;
}): UseQueryResult<GetDataUsageDataStreamsResponse, IHttpFetchError> => {
  const { http } = useKibanaContextForPlugin().services;

  return useQuery<GetDataUsageDataStreamsResponse, IHttpFetchError>({
    queryKey: ['get-data-usage-data-streams'],
    ...options,
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      return http
        .get<GetDataUsageDataStreamsResponse>(DATA_USAGE_DATA_STREAMS_API_ROUTE, {
          signal,
          version: '1',
        })
        .then((response) => {
          const augmentedDataStreamsBasedOnSelectedItems = response.reduce<{
            selected: GetDataUsageDataStreamsResponse;
            rest: GetDataUsageDataStreamsResponse;
          }>(
            (acc, ds, i) => {
              const item = {
                name: ds.name,
                storageSizeBytes: ds.storageSizeBytes,
                selected: ds.selected,
              };

              if (selectedDataStreams?.includes(ds.name) && i < DEFAULT_SELECTED_OPTIONS) {
                acc.selected.push({ ...item, selected: true });
              } else {
                acc.rest.push({ ...item, selected: false });
              }

              return acc;
            },
            { selected: [], rest: [] }
          );

          return [
            ...augmentedDataStreamsBasedOnSelectedItems.selected,
            ...augmentedDataStreamsBasedOnSelectedItems.rest,
          ];
        })
        .catch((error) => {
          throw error.body;
        });
    },
  });
};
