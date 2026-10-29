/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  ControlFieldCapability,
  ResolveControlFieldCapabilities,
} from '@kbn/dashboard-agent-authoring';

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

/**
 * Loads the capabilities of the requested fields in one `_field_caps` request. Injected like the
 * other resolvers so dashboard authoring stays free of Elasticsearch access.
 */
export const createControlFieldCapabilitiesResolver = ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): ResolveControlFieldCapabilities => {
  return async ({ index, fieldNames, projectRouting }) => {
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
};
