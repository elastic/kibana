/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { buildQueryFromFilters } from '@kbn/es-query';

import type { ExportResultsRequestOptions } from '../../../../../common/search_strategy/osquery';
import { buildExportResultsIndex } from '../../../../utils/build_export_results_index';
import { getQueryFilter } from '../../../../utils/build_query';
import { composeExportKuery } from '../../../../lib/compose_export_kuery';

export const buildExportResultsQuery = ({
  baseFilter,
  pit,
  kuery,
  agentIds,
  esFilters,
  searchAfter,
  size,
  ecsMapping,
  integrationNamespaces,
  trackTotalHits,
  ccsEnabled,
}: ExportResultsRequestOptions & {
  ccsEnabled?: boolean;
}): ISearchRequestParams => {
  const filter = composeExportKuery({ baseFilter, kuery, agentIds });
  const kqlFilterClause = getQueryFilter({ filter });

  const { filter: esFilterClauses, must_not: esFilterMustNotClauses } =
    esFilters && esFilters.length > 0
      ? buildQueryFromFilters(esFilters, undefined)
      : { filter: [], must_not: [] };

  // Shared with the export route handler's PIT so both scan the same namespace-
  // and CCS-resolved targets. Mirrors query.all_results.dsl.ts tolerance flags.
  const index = buildExportResultsIndex({
    integrationNamespaces,
    ccsEnabled: ccsEnabled ?? false,
  });

  // `index` is included so the strategy can route to the correct internal/public
  // ES client (see osquerySearchStrategyProvider). The strategy strips `index`,
  // `allow_no_indices`, and `ignore_unavailable` from the params before the ES
  // call when `pit` is present, because ES rejects search requests that specify
  // both an index and a PIT (the PIT already encodes the index scope).
  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index,
    pit,
    query: {
      bool: {
        // Space scoping is enforced centrally in the search strategy (enforceSpaceScope).
        filter: [kqlFilterClause, ...(esFilterClauses as Array<Record<string, unknown>>)],
        ...(esFilterMustNotClauses.length > 0 ? { must_not: esFilterMustNotClauses } : {}),
      },
    },
    size,
    ...(trackTotalHits ? { track_total_hits: true } : {}),
    fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
    sort: [{ '@timestamp': { order: 'desc' as const } }, '_doc'],
    _source: ecsMapping ? true : ['agent'],
    ...(searchAfter ? { search_after: searchAfter } : {}),
  };
};
