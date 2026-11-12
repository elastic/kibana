/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentDataset } from '@kbn/custom-content-common';

export interface ToDatasetsParams {
  /** What to show, or what to change. Describes the query when one is generated. */
  nlQuery?: string;
  /** Index, alias or data stream queries are generated from. */
  index?: string;
  /** A query the user supplied verbatim, replacing the first; `null` removes the panel's queries. */
  esql?: string | null;
  /** `false`: the panel has no data. `true`: it has, generated when it has none. */
  hasData?: boolean;
  /** Regenerate the first query from `nlQuery`, starting from the stored one. */
  regenerateESQL?: boolean;
  /** The panel's queries by position, which the fields above would only repeat. */
  datasets?: readonly CustomContentDataset[];
  /** The queries the panel holds now. */
  existingQueries: readonly string[];
  isNewPanel: boolean;
}

export interface CustomContentQueryChanges {
  /** What each position should become; positions it does not reach are kept. */
  datasets?: CustomContentDataset[];
  /** Remove every query, which leaves a panel with static content. */
  clearQueries?: boolean;
}

/**
 * Says what the callers' single-query fields do to the queries of a panel as `datasets`, the one
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
  datasets,
  existingQueries,
  isNewPanel,
}: ToDatasetsParams): CustomContentQueryChanges => {
  if (datasets) {
    if (esql !== undefined || hasData === false || regenerateESQL) {
      throw new Error(
        'datasets replaces esql, hasData: false and regenerateESQL: put each query on its dataset.'
      );
    }
    // `index` is where the queries without their own are generated from.
    return {
      datasets: datasets.map((dataset) =>
        dataset.description && !dataset.index && index ? { ...dataset, index } : dataset
      ),
    };
  }

  if (esql?.trim()) return { datasets: [{ esql }] };
  if (esql === null || hasData === false) return { clearQueries: true };

  const generate = isNewPanel || regenerateESQL || (hasData === true && !existingQueries[0]);
  return generate ? { datasets: [{ description: nlQuery ?? '', index }] } : {};
};
