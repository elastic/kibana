/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';

/** Whether a mapped field can back a `STATS BY` across the whole index, and why not. */
export type ControlFieldCapability =
  | { status: 'usable'; types: string[] }
  | { status: 'conflicting' }
  | { status: 'not_aggregatable' };

/** Field capabilities keyed by name. Fields not mapped on the index are absent. */
export type ControlFieldCapabilities = Map<string, ControlFieldCapability>;

interface FieldTypesTarget {
  index: string;
  projectRouting?: string;
}

export interface AggregatableFieldTypesLoader {
  /** Load the given fields, requesting only the ones not loaded before for this target. */
  loadFields: (
    params: FieldTypesTarget & { fieldNames: readonly string[] }
  ) => Promise<ControlFieldCapabilities>;
}

/**
 * A field spanning several indices is only usable when it is aggregatable in all of them and
 * its mappings share one Kibana field type; otherwise `STATS BY` can hit a conflicting mapping.
 */
const isAggregatableEverywhere = (capabilities: FieldCapsFieldCapability[]): boolean =>
  capabilities.every(({ aggregatable }) => aggregatable) &&
  new Set(capabilities.map(({ type }) => castEsToKbnFieldTypeName(type))).size === 1;

const toControlFieldCapability = (
  capabilities: FieldCapsFieldCapability[]
): ControlFieldCapability => {
  if (isAggregatableEverywhere(capabilities)) {
    return { status: 'usable', types: capabilities.map(({ type }) => type) };
  }
  return capabilities.length > 1 && capabilities.some(({ aggregatable }) => aggregatable)
    ? { status: 'conflicting' }
    : { status: 'not_aggregatable' };
};

const fetchAggregatableFieldTypes = async ({
  esClient,
  index,
  projectRouting,
  fields,
}: FieldTypesTarget & {
  esClient: ElasticsearchClient;
  fields: readonly string[];
}): Promise<ControlFieldCapabilities> => {
  const response = await esClient.fieldCaps({
    index,
    fields: [...fields],
    filters: '-metadata',
    ignore_unavailable: true,
    allow_no_indices: true,
    ...(projectRouting ? { project_routing: projectRouting } : {}),
  });
  return new Map(
    Object.entries(response.fields).map(
      ([fieldName, capsByType]) =>
        [fieldName, toControlFieldCapability(Object.values(capsByType))] as const
    )
  );
};

const toCacheKey = (...parts: Array<string | undefined>): string =>
  JSON.stringify(parts.map((part) => part ?? null));

/**
 * Create a loader that caches `_field_caps` results per field for the lifetime
 * of one operations execution.
 */
export const createAggregatableFieldTypesLoader = (
  esClient: ElasticsearchClient
): AggregatableFieldTypesLoader => {
  const fieldCache = new Map<string, Promise<ControlFieldCapability | undefined>>();

  const loadFields: AggregatableFieldTypesLoader['loadFields'] = async ({
    index,
    projectRouting,
    fieldNames,
  }) => {
    const uniqueFieldNames = [...new Set(fieldNames)];
    const toFieldCacheKey = (fieldName: string) => toCacheKey(index, projectRouting, fieldName);

    const uncachedFieldNames = uniqueFieldNames.filter(
      (fieldName) => !fieldCache.has(toFieldCacheKey(fieldName))
    );
    if (uncachedFieldNames.length > 0) {
      const pending = fetchAggregatableFieldTypes({
        esClient,
        index,
        projectRouting,
        fields: uncachedFieldNames,
      });
      uncachedFieldNames.forEach((fieldName) =>
        fieldCache.set(
          toFieldCacheKey(fieldName),
          pending.then((capabilities) => capabilities.get(fieldName))
        )
      );
    }

    const entries = await Promise.all(
      uniqueFieldNames.map(
        async (fieldName) => [fieldName, await fieldCache.get(toFieldCacheKey(fieldName))] as const
      )
    );
    return new Map(
      entries.flatMap(([fieldName, capability]) => (capability ? [[fieldName, capability]] : []))
    );
  };

  return { loadFields };
};
