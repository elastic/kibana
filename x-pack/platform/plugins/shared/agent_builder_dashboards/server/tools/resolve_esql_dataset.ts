/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { getIndexPatternFromESQLQuery, parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';

const DEFAULT_TIME_FIELD = '@timestamp';

export interface ResolvedEsqlDataset {
  index: string;
  timeField: string;
}

/** Resolve an ES|QL query's source and time field when it is time-filterable. */
export const resolveEsqlDataset = async (
  esClient: IScopedClusterClient,
  query: string,
  projectRouting?: string
): Promise<ResolvedEsqlDataset | undefined> => {
  const timeField = parseTimeFieldFromESQLQuery(query);
  const index = getIndexPatternFromESQLQuery(query);
  if (!index) {
    return undefined;
  }

  if (timeField) {
    return { index, timeField };
  }

  const response = await esClient.asCurrentUser.fieldCaps({
    index,
    fields: DEFAULT_TIME_FIELD,
    include_unmapped: false,
    project_routing: projectRouting,
  });

  return response.fields?.[DEFAULT_TIME_FIELD]
    ? { index, timeField: DEFAULT_TIME_FIELD }
    : undefined;
};
