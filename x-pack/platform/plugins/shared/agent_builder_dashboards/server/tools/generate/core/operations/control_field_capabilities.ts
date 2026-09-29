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

/** Load the capabilities of the given fields in one `_field_caps` request. */
export const fetchControlFieldCapabilities = async ({
  esClient,
  index,
  projectRouting,
  fieldNames,
}: {
  esClient: ElasticsearchClient;
  index: string;
  projectRouting?: string;
  fieldNames: readonly string[];
}): Promise<ControlFieldCapabilities> => {
  const response = await esClient.fieldCaps({
    index,
    fields: [...new Set(fieldNames)],
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
