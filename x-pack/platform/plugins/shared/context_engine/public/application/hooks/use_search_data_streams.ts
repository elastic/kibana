/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { searchDataStreams } from '../api/data_streams';
import { useKibana } from './use_kibana';

interface UseSearchDataStreamsArgs {
  search: string;
  enabled: boolean;
}

interface UseSearchDataStreamsResult {
  dataStreams: string[];
  isLoading: boolean;
  isError: boolean;
}

/** Searches data streams for the trace picker; hidden streams excluded server-side. TanStack Query cancels the previous in-flight search automatically when `search` changes or the component unmounts. */
export const useSearchDataStreams = ({
  search,
  enabled,
}: UseSearchDataStreamsArgs): UseSearchDataStreamsResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isFetching, isError } = useQuery({
    queryKey: ['context_engine', 'data_streams_search', search],
    queryFn: ({ signal }) => searchDataStreams(http, { search, signal }),
    enabled,
    keepPreviousData: true,
  });

  return {
    dataStreams: data?.dataStreams ?? [],
    isLoading: isFetching,
    isError,
  };
};
