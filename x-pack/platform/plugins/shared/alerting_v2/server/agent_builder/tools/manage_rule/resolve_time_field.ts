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
 * Resolves the time field for an ES|QL rule from its source index.
 * Returns `null` when the index has no usable date field at all (caller should
 * fail), or `undefined` when it can't be looked up (caller keeps the existing
 * value).
 *
 * On the edit path `currentTimeField` may hold a previously-stored field (e.g.
 * `@timestamp`) that is absent from a newly-targeted but otherwise valid index
 * (e.g. `kibana_sample_data_flights`, which only has `timestamp`). In that case
 * we auto-pick an available date field — mirroring the create path — rather than
 * failing with a misleading "no date field" error.
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
    const resolved = resolveTimeField({ dateFields, currentTimeField });
    /**
     * A `null` result with a `currentTimeField` set means the stored field is
     * stale (not on this index). Re-resolve without it to auto-pick an available
     * date field; this still yields `null` when the index has no date field.
     */
    if (resolved === null && currentTimeField) {
      return resolveTimeField({ dateFields });
    }
    return resolved;
  } catch {
    return undefined;
  }
};
