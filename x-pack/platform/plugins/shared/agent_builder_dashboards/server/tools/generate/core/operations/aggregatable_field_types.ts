/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/** Whether a mapped field can back a `STATS BY` across the whole index, and why not. */
export type ControlFieldCapability =
  | { status: 'usable'; type: string }
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
 * A field is usable only with one ES type across the matching indices that is aggregatable in
 * all of them. ES|QL rejects `STATS BY` on a field mapped as different types, even `long` and
 * `integer`.
 */
const toControlFieldCapability = ([
  capability,
  ...otherCapabilities
]: FieldCapsFieldCapability[]): ControlFieldCapability => {
  if (otherCapabilities.length > 0) {
    return [capability, ...otherCapabilities].some(({ aggregatable }) => aggregatable)
      ? { status: 'conflicting' }
      : { status: 'not_aggregatable' };
  }
  return capability.aggregatable
    ? { status: 'usable', type: capability.type }
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
