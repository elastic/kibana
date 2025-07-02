/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { Pagination } from '@elastic/eui';
import { pageToPagination, Paginate } from '@kbn/search-connectors';
import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface SearchDocumentsApiLogicArgs {
  docsPerPage?: number;
  indexName: string;
  pagination: { pageIndex: number; pageSize: number };
  query?: string;
  http?: HttpSetup;
}

export interface SearchDocumentsApiLogicValues {
  meta: Pagination;
  results: Paginate<SearchHit>;
}

export type SearchDocumentsApiLogicActions = Actions<
  SearchDocumentsApiLogicArgs,
  SearchDocumentsApiLogicValues
>;

export const searchDocuments = async ({
  docsPerPage,
  indexName,
  pagination,
  query: searchQuery,
  http,
}: SearchDocumentsApiLogicArgs) => {
  const newIndexName = encodeURIComponent(indexName);
  const route = `/internal/content_connectors/indices/${newIndexName}/search`;
  const query = {
    page: pagination.pageIndex,
    size: docsPerPage || pagination.pageSize,
  };

  const response = await http?.post<SearchDocumentsApiLogicValues>(route, {
    body: JSON.stringify({
      searchQuery,
    }),
    query,
  });

  return response
    ? {
        meta: pageToPagination(response.results?._meta?.page),
        results: response.results?.data,
      }
    : undefined;
};

export const searchDocumentsApiLogic = (indexName: string) =>
  createApiLogic(['search_documents_api_logic', indexName], searchDocuments);
