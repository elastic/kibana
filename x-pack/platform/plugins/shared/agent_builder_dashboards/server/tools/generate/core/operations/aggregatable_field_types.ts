/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/** Aggregatable ES field types keyed by field name. */
export type AggregatableFieldTypes = Map<string, string[]>;

export type LoadAggregatableFieldTypes = (params: {
  index: string;
  projectRouting?: string;
}) => Promise<AggregatableFieldTypes>;

const fetchAggregatableFieldTypes = async (
  esClient: ElasticsearchClient,
  index: string,
  projectRouting?: string
): Promise<AggregatableFieldTypes> => {
  const response = await esClient.fieldCaps({
    index,
    fields: ['*'],
    filters: '-metadata',
    ignore_unavailable: true,
    allow_no_indices: true,
    ...(projectRouting ? { project_routing: projectRouting } : {}),
  });
  return new Map(
    Object.entries(response.fields)
      .map(
        ([fieldName, capsByType]) =>
          [
            fieldName,
            Object.values(capsByType)
              .filter(({ aggregatable }) => aggregatable)
              .map(({ type }) => type),
          ] as const
      )
      .filter(([, types]) => types.length > 0)
  );
};

/**
 * Create a loader that calls `_field_caps` at most once per index and project
 * routing for the lifetime of one operations execution.
 */
export const createAggregatableFieldTypesLoader = (
  esClient: ElasticsearchClient
): LoadAggregatableFieldTypes => {
  const cache = new Map<string, Promise<AggregatableFieldTypes>>();

  return ({ index, projectRouting }) => {
    const cacheKey = JSON.stringify([index, projectRouting ?? null]);
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = fetchAggregatableFieldTypes(esClient, index, projectRouting);
    cache.set(cacheKey, pending);
    return pending;
  };
};
