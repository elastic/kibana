/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { resolveTimeField } from '@kbn/alerting-v2-utils';

const DATE_FIELD_TYPES = ['date', 'date_nanos'];

/**
 * Resolves the time field for an ES|QL rule from its source index (rna-program#613).
 * Returns `null` when the index has no usable date field (caller should fail),
 * or `undefined` when it can't be looked up (caller keeps the existing value).
 */
export const resolveTimeFieldForQuery = async (
  esClient: IScopedClusterClient,
  rootQuery: string,
  currentTimeField?: string
): Promise<string | null | undefined> => {
  const index = getIndexPatternFromESQLQuery(rootQuery);
  if (!index) {
    return undefined;
  }

  try {
    const response = await esClient.asCurrentUser.fieldCaps({
      index,
      fields: '*',
      types: DATE_FIELD_TYPES,
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const dateFields = Object.keys(response.fields ?? {});
    return resolveTimeField({ dateFields, currentTimeField });
  } catch {
    return undefined;
  }
};
