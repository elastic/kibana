/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { resolveTimeField } from '@kbn/alerting-v2-schemas';

// Elasticsearch date field types reported by the field caps API.
const DATE_FIELD_TYPES = ['date', 'date_nanos'];

/**
 * Resolves the correct time field for an ES|QL rule by inspecting the date
 * fields on the query's source index, so the agentic (Agent Builder) rule
 * creation path matches the rule form UI instead of blindly defaulting to
 * `@timestamp` (rna-program#613: `kibana_sample_data_flights` only has
 * `timestamp`).
 *
 * Best-effort: returns `undefined` when the index has no discoverable date
 * fields or the lookup fails, letting the caller keep the existing value and
 * the schema default (`@timestamp`) apply.
 */
export const resolveTimeFieldForQuery = async (
  esClient: IScopedClusterClient,
  rootQuery: string,
  currentTimeField?: string
): Promise<string | undefined> => {
  const index = getIndexPatternFromESQLQuery(rootQuery);
  if (!index) {
    return undefined;
  }

  try {
    const response = await esClient.asCurrentUser.fieldCaps({
      index,
      fields: '*',
      types: DATE_FIELD_TYPES,
      // Missing indices should not fail resolution; the query validation step
      // already surfaces genuinely invalid indices to the user.
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const dateFields = Object.keys(response.fields ?? {});
    if (dateFields.length === 0) {
      return undefined;
    }

    return resolveTimeField({ dateFields, currentTimeField });
  } catch {
    return undefined;
  }
};
