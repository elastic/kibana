/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentDataQuery } from './schema';

export interface QueryChangesParams {
  /** What to show, or what to change. Describes the query when one is generated. */
  nlQuery?: string;
  /** Index, alias or data stream queries are generated from. */
  index?: string;
  /** A query the user supplied, to use as it is, replacing the first; `null` removes the panel's queries. */
  esql?: string | null;
  /** `false`: the panel has no data. `true`: it has, generated when it has none. */
  hasData?: boolean;
  /** Regenerate the first query from `nlQuery`, starting from the stored one. */
  regenerateESQL?: boolean;
  /** The panel's queries by position, which the fields above would only repeat. */
  dataQueries?: readonly CustomContentDataQuery[];
  /** The queries the panel holds now. */
  existingQueries: readonly string[];
  isNewPanel: boolean;
}

export interface CustomContentQueryChanges {
  /** What each position should become; positions it does not reach are kept. */
  dataQueries?: CustomContentDataQuery[];
  /** Remove every query, which leaves a panel with static content. */
  removeAllQueries?: boolean;
}

/**
 * Says what the callers' single-query fields do to the queries of a panel as `dataQueries`, the one
 * way `buildCustomContentConfig` is told about queries. A supplied query wins. A new panel gets a
 * generated query unless it is declared data-free. An edit keeps the stored query unless it is
 * replaced, removed or regenerated, so a style-only edit never pays for generation.
 */
export const toCustomContentQueryChanges = ({
  nlQuery,
  index,
  esql,
  hasData,
  regenerateESQL,
  dataQueries,
  existingQueries,
  isNewPanel,
}: QueryChangesParams): CustomContentQueryChanges => {
  if (dataQueries) {
    if (esql !== undefined || hasData === false || regenerateESQL) {
      throw new Error(
        'dataQueries replaces esql, hasData: false and regenerateESQL: put each query on its data query.'
      );
    }
    // `index` is where the queries without their own are generated from.
    return {
      dataQueries: dataQueries.map((dataQuery) =>
        dataQuery.description && !dataQuery.index && index ? { ...dataQuery, index } : dataQuery
      ),
    };
  }

  if (esql?.trim()) return { dataQueries: [{ esql }] };
  if (esql === null || hasData === false) return { removeAllQueries: true };

  const generate = isNewPanel || regenerateESQL || (hasData === true && !existingQueries[0]);
  return generate ? { dataQueries: [{ description: nlQuery ?? '', index }] } : {};
};
