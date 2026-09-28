/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { MappingField } from '../mappings';
import { executeEsql } from '../esql';

/**
 * An ES|QL view, registered via the `_query/view` API. Views are only queryable through
 * ES|QL (`FROM <name>`) and are invisible to `_resolve/index`, `_field_caps` and `_mapping`.
 * `description` is optional because the Elasticsearch client type currently exposes only
 * `name` and `query`; the API may still return a description.
 */
export interface ViewInfo {
  name: string;
  query: string;
  description?: string;
}

interface EsqlViewListItem {
  name: string;
  query: string;
  description?: string;
}

/**
 * Lists ES|QL views registered in the cluster via `GET _query/view`.
 *
 * The call is best-effort: clusters that don't support views return an error which we
 * swallow, yielding an empty list so view support degrades gracefully.
 */
export const listViews = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<ViewInfo[]> => {
  try {
    const response = await esClient.esql.getView();
    const views = (response?.views ?? []) as EsqlViewListItem[];
    return views.map((view) => ({
      name: view.name,
      query: view.query,
      ...(view.description ? { description: view.description } : {}),
    }));
  } catch {
    return [];
  }
};

/**
 * Resolves the output columns of an ES|QL view.
 *
 * Views have no mappings or field caps, so we run `FROM <name> | LIMIT 0` and map the
 * returned column metadata (name + ES|QL type) to {@link MappingField}.
 */
export const getViewFields = async ({
  name,
  esClient,
}: {
  name: string;
  esClient: ElasticsearchClient;
}): Promise<MappingField[]> => {
  const { columns } = await executeEsql({
    query: `FROM ${name} | LIMIT 0`,
    esClient,
  });
  return columns.map((column) => ({
    path: column.name,
    type: column.type,
    meta: {},
  }));
};
