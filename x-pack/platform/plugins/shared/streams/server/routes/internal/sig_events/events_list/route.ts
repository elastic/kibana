/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  sigEventSchema,
  EVIDENCE_RESULTS,
  EXPOSURE_VALUES,
  SIG_EVENT_DOC_TYPES,
} from '../../../../../common/sig_events_types';
import type {
  SigEvent,
  SigEventsListResponse,
  LifecycleEvidence,
  LifecycleDetection,
  LifecycleDiscovery,
  LifecycleVerdict,
  SigEventLifecycle,
} from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

// ---------------------------------------------------------------------------
// Index constants
// ---------------------------------------------------------------------------

const EVENTS_INDEX = 'sigevents-events-ms';
const DISCOVERIES_INDEX = 'sigevents-discoveries-ms';
const VERDICTS_INDEX = 'sigevents-verdicts-ms';
const DETECTIONS_INDEX = 'sigevents-detections-ms';

// ---------------------------------------------------------------------------
// List route helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Lifecycle helpers (ES document schemas + mappers)
// ---------------------------------------------------------------------------

const DEFAULT_EVIDENCE_RESULT: (typeof EVIDENCE_RESULTS)[number] = 'empty';

const esEvidenceSchema = z.object({
  rule_name: z.string().nullable().optional(),
  result: z.enum(EVIDENCE_RESULTS).optional(),
  description: z.string().optional(),
  stream_name: z.string().optional(),
  row_count: z.number().optional(),
  collected_at: z.string().optional(),
  esql_query: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
});

const esDiscoverySourceSchema = z.object({
  '@timestamp': z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  root_cause: z.string().optional(),
  criticality: z.number().optional(),
  impact: z.string().optional(),
  confidence: z.number().optional(),
  evidences: z.array(esEvidenceSchema).optional(),
  dependency_edges: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        protocol: z.string().optional(),
        exposure: z.enum(EXPOSURE_VALUES).optional(),
      })
    )
    .optional(),
  infra_components: z
    .array(
      z.object({
        title: z.string().optional(),
        workloads: z.array(z.string()).optional(),
        exposure: z.enum(EXPOSURE_VALUES).optional(),
      })
    )
    .optional(),
  cause_kis: z.array(z.object({ name: z.string(), stream_name: z.string() })).optional(),
  discovery_slug: z.string().optional(),
  kind: z.string().optional(),
  change_point_occurrence: z.string().optional(),
  conversation_id: z.string().nullable().optional(),
  detections: z
    .array(
      z.object({
        detection_id: z.string(),
      })
    )
    .optional(),
});

const esVerdictSourceSchema = z.object({
  '@timestamp': z.string(),
  verdict: z.string(),
  original_verdict: z.string().optional(),
  verdict_summary: z.string().optional(),
  assessment_note: z.string().optional(),
  recommended_action: z.string().optional(),
  criticality: z.number().optional(),
  confidence: z.number().optional(),
  recommendations: z.array(z.string()).optional(),
  evidences: z.array(esEvidenceSchema).optional(),
  conversation_id: z.string().nullable().optional(),
});

const esEventSourceSchema = z.object({
  discovery_id: z.string().optional(),
});

const esDetectionSourceSchema = z.object({
  '@timestamp': z.string(),
  detection_id: z.string(),
  rule_name: z.string(),
  stream: z.string().optional(),
  alert_count: z.number().optional(),
  superseded: z.boolean().optional(),
  detection_evidence: z
    .object({
      change_point_type: z.string().optional(),
      p_value: z.number().optional(),
    })
    .optional(),
});

const mapEvidence = (ev: z.infer<typeof esEvidenceSchema>): LifecycleEvidence => ({
  rule_name: ev.rule_name ?? null,
  result: ev.result ?? DEFAULT_EVIDENCE_RESULT,
  description: ev.description ?? '',
  stream_name: ev.stream_name ?? '',
  row_count: ev.row_count ?? 0,
  collected_at: ev.collected_at ?? '',
  esql_query: ev.esql_query ?? null,
  confirmed: ev.confirmed,
});

const mapDetection = (hit: { _id?: string; _source?: unknown }): LifecycleDetection => {
  const src = esDetectionSourceSchema.parse(hit._source);
  return {
    id: hit._id ?? '',
    detection_id: src.detection_id,
    timestamp: src['@timestamp'],
    rule_name: src.rule_name,
    stream_name: src.stream ?? '',
    alert_count: src.alert_count ?? 0,
    change_point_type: src.detection_evidence?.change_point_type ?? null,
    p_value: src.detection_evidence?.p_value ?? null,
    superseded: src.superseded ?? false,
  };
};

const mapDiscovery = (hit: { _id?: string; _source?: unknown }): LifecycleDiscovery => {
  const src = esDiscoverySourceSchema.parse(hit._source);

  return {
    id: hit._id ?? '',
    timestamp: src['@timestamp'],
    title: src.title ?? '',
    summary: src.summary ?? '',
    root_cause: src.root_cause ?? '',
    criticality: src.criticality ?? null,
    impact: src.impact || null,
    confidence: src.confidence ?? null,
    evidences: (src.evidences ?? []).map(mapEvidence),
    dependency_edges: src.dependency_edges ?? [],
    infra_components: src.infra_components ?? [],
    cause_kis: src.cause_kis ?? [],
    discovery_slug: src.discovery_slug ?? '',
    kind: src.kind ?? '',
    change_point_occurrence: src.change_point_occurrence || null,
    conversation_id: src.conversation_id || null,
  };
};

const mapVerdict = (hit: { _id?: string; _source?: unknown }): LifecycleVerdict => {
  const src = esVerdictSourceSchema.parse(hit._source);
  return {
    id: hit._id ?? '',
    timestamp: src['@timestamp'],
    verdict: src.verdict,
    original_verdict: src.original_verdict,
    verdict_summary: src.verdict_summary ?? '',
    assessment_note: src.assessment_note ?? '',
    recommended_action: src.recommended_action ?? '',
    criticality: src.criticality ?? null,
    confidence: src.confidence ?? null,
    recommendations: src.recommendations ?? [],
    evidences: (src.evidences ?? []).map(mapEvidence),
    conversation_id: src.conversation_id || null,
  };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

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

const getLifecycleRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sig_events/{eventId}/lifecycle',
  params: z.object({
    path: z.object({ eventId: z.string().describe('The event document ID') }),
  }),
  options: {
    access: 'internal',
    summary: 'Get the lifecycle trace for a significant event',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, request, getScopedClients, server }): Promise<SigEventLifecycle> => {
    const { scopedClusterClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { eventId } = params.path;
    const client = scopedClusterClient.asCurrentUser;

    const eventResponse = await client.get({ index: EVENTS_INDEX, id: eventId });
    const eventSource = esEventSourceSchema.parse(eventResponse._source);
    const { discovery_id: discoveryId } = eventSource;

    if (!discoveryId) {
      return { event_id: eventId, detections: [], discoveries: [], verdicts: [] };
    }

    const [discoveriesResult, verdictsResult] = await Promise.all([
      client.search({
        index: DISCOVERIES_INDEX,
        size: 50,
        sort: [{ '@timestamp': 'asc' }],
        query: { bool: { filter: [{ term: { discovery_id: discoveryId } }] } },
      }),
      client.search({
        index: VERDICTS_INDEX,
        size: 50,
        sort: [{ '@timestamp': 'asc' }],
        query: { bool: { filter: [{ term: { discovery_id: discoveryId } }] } },
      }),
    ]);

    const discoveries = discoveriesResult.hits.hits.map(mapDiscovery);
    const verdicts = verdictsResult.hits.hits.map(mapVerdict);

    const detectionIds = discoveriesResult.hits.hits.flatMap((hit) => {
      const src = esDiscoverySourceSchema.parse(hit._source);
      return (src.detections ?? []).map((d) => d.detection_id);
    });

    let detections: LifecycleDetection[] = [];
    if (detectionIds.length > 0) {
      const detectionsResult = await client.search({
        index: DETECTIONS_INDEX,
        size: 500,
        sort: [{ '@timestamp': 'asc' }],
        query: { bool: { filter: [{ terms: { detection_id: detectionIds } }] } },
      });
      detections = detectionsResult.hits.hits.map(mapDetection);
    }

    return { event_id: eventId, detections, discoveries, verdicts };
  },
});

const INDEX_MAP: Record<(typeof SIG_EVENT_DOC_TYPES)[number], string> = {
  detection: DETECTIONS_INDEX,
  discovery: DISCOVERIES_INDEX,
  verdict: VERDICTS_INDEX,
  event: EVENTS_INDEX,
};

const getRawDocRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sig_events/raw/{type}/{docId}',
  params: z.object({
    path: z.object({
      type: z.enum(SIG_EVENT_DOC_TYPES),
      docId: z.string(),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Get the raw ES document for a sig_events entity',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, request, getScopedClients, server }) => {
    const { scopedClusterClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { type, docId } = params.path;
    const client = scopedClusterClient.asCurrentUser;
    const index = INDEX_MAP[type];

    const response = await client.get({ index, id: docId });
    return { _source: response._source ?? {} };
  },
});

export const internalEventsListRoutes = {
  ...listSigEventsRoute,
  ...getLifecycleRoute,
  ...getRawDocRoute,
};
