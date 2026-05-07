/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { sigEventSchema } from '../../../../../common';
import type { SigEvent, SigEventsListResponse } from '../../../../../common';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { EVENTS_INDEX } from './constants';

const SEARCH_FIELDS = ['title', 'summary', 'root_cause', 'rule_names', 'stream_names'];

const SORTABLE_FIELDS = new Set(['@timestamp', 'criticality', 'impact', 'verdict', 'title']);

const LIST_SOURCE_EXCLUDES = ['evidences', 'dependency_edges', 'infra_components', 'cause_kis'];

const MIN_WILDCARD_LENGTH = 3;

const arrayOrString = z
  .union([z.string().transform((val) => [val]), z.array(z.string())])
  .optional();

const buildSearchClauses = (search: string): Record<string, unknown> => {
  const should: Array<Record<string, unknown>> = [
    {
      multi_match: {
        query: search,
        fields: SEARCH_FIELDS,
        type: 'phrase_prefix',
        lenient: true,
      },
    },
    {
      multi_match: {
        query: search,
        fields: SEARCH_FIELDS,
        type: 'best_fields',
        fuzziness: 'AUTO',
        lenient: true,
      },
    },
  ];

  if (search.length >= MIN_WILDCARD_LENGTH) {
    const escaped = search.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&');
    should.unshift({
      query_string: {
        query: `*${escaped}*`,
        fields: SEARCH_FIELDS,
        lenient: true,
        analyze_wildcard: true,
      },
    });
  }

  return { bool: { should, minimum_should_match: 1 } };
};

const toSigEvent = (hit: { _id?: string; _source?: unknown }): SigEvent =>
  sigEventSchema.parse(Object.assign({}, hit._source, { id: hit._id ?? '' }));

const listSigEventsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sig_events/list',
  params: z.object({
    query: z.object({
      verdict: arrayOrString.describe('Filter by verdict status'),
      impact: arrayOrString.describe('Filter by impact level'),
      stream: arrayOrString.describe('Filter by stream name'),
      search: z.string().optional().describe('Free text search'),
      from: z.string().optional().describe('Start of time range (ISO string)'),
      to: z.string().optional().describe('End of time range (ISO string)'),
      page: z.coerce.number().int().min(1).optional().default(1).describe('Page number (1-based)'),
      perPage: z.coerce
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(25)
        .describe('Items per page'),
      sortField: z.string().optional().default('@timestamp').describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'List significant events with filtering and pagination',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<SigEventsListResponse> => {
    const { scopedClusterClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { verdict, impact, stream, search, from, to, page, perPage, sortField, sortDirection } =
      params.query;

    const mustClauses: Array<Record<string, unknown>> = [];
    const filterClauses: Array<Record<string, unknown>> = [];

    if (verdict && verdict.length > 0) {
      filterClauses.push({ terms: { verdict } });
    }

    if (impact && impact.length > 0) {
      filterClauses.push({ terms: { impact } });
    }

    if (stream && stream.length > 0) {
      filterClauses.push({ terms: { stream_names: stream } });
    }

    if (search) {
      mustClauses.push(buildSearchClauses(search));
    }

    if (from || to) {
      const rangeFilter: Record<string, string> = {};
      if (from) rangeFilter.gte = from;
      if (to) rangeFilter.lte = to;
      filterClauses.push({ range: { '@timestamp': rangeFilter } });
    }

    const offset = (page - 1) * perPage;
    const validatedSortField = SORTABLE_FIELDS.has(sortField) ? sortField : '@timestamp';

    const response = await scopedClusterClient.asCurrentUser.search({
      index: EVENTS_INDEX,
      size: perPage,
      from: offset,
      sort: [{ [validatedSortField]: sortDirection }],
      track_total_hits: 10000,
      _source: { excludes: LIST_SOURCE_EXCLUDES },
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
          must_not: [{ exists: { field: 'grouped_into' } }],
        },
      },
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const events: SigEvent[] = response.hits.hits.map(toSigEvent);

    return { total, events };
  },
});

const getSigEventRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sig_events/{eventId}',
  params: z.object({
    path: z.object({ eventId: z.string().describe('The event document ID') }),
  }),
  options: {
    access: 'internal',
    summary: 'Get a single significant event by ID',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, request, getScopedClients, server }): Promise<SigEvent> => {
    const { scopedClusterClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { eventId } = params.path;

    const response = await scopedClusterClient.asCurrentUser.get({
      index: EVENTS_INDEX,
      id: eventId,
    });

    return toSigEvent(response);
  },
});

export const internalEventsListRoutes = {
  ...listSigEventsRoute,
  ...getSigEventRoute,
};
