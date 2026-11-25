/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH } from '@kbn/alerting-v2-constants';
import type {
  FindExternalSourcesRequest,
  FindExternalSourcesResponse,
  FindExternalSourcesSortField,
} from '@kbn/alerting-v2-schemas';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { importKeys } from './query_key_factory';

export interface FindImportsUiParams {
  page: number;
  perPage: number;
  search?: string;
  sortField?: FindExternalSourcesSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface ImportListItem {
  id: string;
  name: string;
  type: string;
  connectorId: string;
}

export interface ImportsPage {
  items: ImportListItem[];
  total: number;
}

export const toFindExternalSourcesRequest = ({
  page,
  perPage,
  search,
  sortField,
  sortOrder,
  ...rest
}: FindImportsUiParams): Complete<FindExternalSourcesRequest> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    search,
    sort_field: sortField,
    sort_order: sortOrder,
    connector_id: undefined,
    type: undefined,
  };
};

/** Returns one page of the external sources of the current space from the external source list API. */
export const fetchImports = async (
  http: HttpStart,
  params: FindImportsUiParams
): Promise<ImportsPage> => {
  const { items, total } = await http.get<FindExternalSourcesResponse>(
    ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH,
    { query: toFindExternalSourcesRequest(params) }
  );
  return {
    items: items.map(({ id, type, metadata, connector_id: connectorId }) => ({
      id,
      name: metadata.name,
      type,
      connectorId,
    })),
    total,
  };
};

/** Loads one page of the imports of the current space, searched and sorted on the server. */
export const useFetchImports = (params: FindImportsUiParams) => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<ImportsPage, Error>({
    queryKey: importKeys.list(params),
    queryFn: () => fetchImports(http, params),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.imports.list.fetchError', {
          defaultMessage: 'Failed to load imports',
        }),
      });
    },
  });
};
