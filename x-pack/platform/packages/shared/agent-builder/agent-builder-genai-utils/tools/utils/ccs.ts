/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { MappingField } from './mappings';
import { processFieldCapsResponse } from './field_caps';

/**
 * Returns true if the resource name targets a remote cluster (contains ':'),
 * indicating a cross-cluster search (CCS) target.
 */
export const isCcsTarget = (name: string): boolean => name.includes(':');

/**
 * Partition an array of named resources into local and CCS (remote) groups.
 * A resource is considered remote if its name contains ':'.
 */
export const partitionByCcs = <T extends { name: string }>(
  resources: T[]
): { local: T[]; remote: T[] } => {
  const local: T[] = [];
  const remote: T[] = [];
  for (const r of resources) {
    (isCcsTarget(r.name) ? remote : local).push(r);
  }
  return { local, remote };
};

/**
 * Retrieves the field list for a given resource using the _field_caps API,
 * which supports cross-cluster search (CCS) index patterns.
 *
 * This is used as a CCS-compatible fallback for the _mapping and
 * _data_stream/_mappings APIs, which do not support remote indices.
 */
export const getFieldsFromFieldCaps = async ({
  resource,
  esClient,
}: {
  resource: string;
  esClient: ElasticsearchClient;
}): Promise<MappingField[]> => {
  const fieldCapRes = await esClient.fieldCaps({ index: resource, fields: ['*'] });
  const { fields } = processFieldCapsResponse(fieldCapRes);
  return fields;
};
