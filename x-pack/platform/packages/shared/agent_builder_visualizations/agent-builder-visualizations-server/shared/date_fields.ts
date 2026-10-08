/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/** Time field Kibana applies the time range to when a query names none. */
export const DEFAULT_TIME_FIELD = '@timestamp';

/** Names of the date fields mapped in `index`. */
export const getDateFieldNames = async (
  esClient: ElasticsearchClient,
  index: string,
  projectRouting?: string
): Promise<string[]> => {
  const { fields } = await esClient.fieldCaps({
    index,
    fields: '*',
    types: ['date', 'date_nanos'],
    include_unmapped: false,
    ...(projectRouting ? { project_routing: projectRouting } : {}),
  });
  return Object.keys(fields ?? {});
};
