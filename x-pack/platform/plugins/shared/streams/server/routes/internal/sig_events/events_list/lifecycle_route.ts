/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EVIDENCE_RESULTS, EXPOSURE_VALUES } from '../../../../../common';
import type {
  LifecycleEvidence,
  LifecycleDiscovery,
  LifecycleVerdict,
  SigEventLifecycle,
} from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const EVENTS_INDEX = 'sigevents-events-ms';
const DISCOVERIES_INDEX = 'sigevents-discoveries-ms';
const VERDICTS_INDEX = 'sigevents-verdicts-ms';
const DETECTIONS_INDEX = 'sigevents-detections-ms';

const DEFAULT_EVIDENCE_RESULT: (typeof EVIDENCE_RESULTS)[number] = 'empty';

// ---------------------------------------------------------------------------
// ES document schemas (input validation — server-only)
// ---------------------------------------------------------------------------

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

const esEmbeddedDetectionSchema = z.object({
  detection_id: z.string(),
  rule_name: z.string(),
  stream_name: z.string(),
  detected_at: z.string(),
  event_count: z.number(),
  change_point_type: z.string(),
});

const esDiscoverySourceSchema = z.object({
  '@timestamp': z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  root_cause: z.string().optional(),
  criticality: z.number().optional(),
  impact: z.string().optional(),
  confidence: z.number().optional(),
  detections: z.array(esEmbeddedDetectionSchema).optional(),
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
  rule_names: z.array(z.string()).optional(),
});

const esDetectionSourceSchema = z.object({
  rule_name: z.string(),
  superseded: z.boolean().optional(),
  detection_evidence: z
    .object({
      p_value: z.number().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

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

const buildDetectionExtras = (
  hits: Array<{ _source?: unknown }>,
  relevantRules: Set<string>
): Map<string, { p_value: number | null; superseded: boolean }> => {
  const extras = new Map<string, { p_value: number | null; superseded: boolean }>();
  for (const hit of hits) {
    const src = esDetectionSourceSchema.parse(hit._source);
    if (relevantRules.has(src.rule_name) && !extras.has(src.rule_name)) {
      extras.set(src.rule_name, {
        p_value: src.detection_evidence?.p_value ?? null,
        superseded: src.superseded ?? false,
      });
    }
  }
  return extras;
};

const mapDiscovery = (
  hit: { _id?: string; _source?: unknown },
  detectionExtras: Map<string, { p_value: number | null; superseded: boolean }>
): LifecycleDiscovery => {
  const src = esDiscoverySourceSchema.parse(hit._source);
  const embeddedDetections = src.detections ?? [];

  return {
    id: hit._id ?? '',
    timestamp: src['@timestamp'],
    title: src.title ?? '',
    summary: src.summary ?? '',
    root_cause: src.root_cause ?? '',
    criticality: src.criticality ?? null,
    impact: src.impact || null,
    confidence: src.confidence ?? null,
    detections: embeddedDetections.map((d) => ({
      ...d,
      p_value: detectionExtras.get(d.rule_name)?.p_value ?? null,
      superseded: detectionExtras.get(d.rule_name)?.superseded ?? false,
    })),
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
// Route
// ---------------------------------------------------------------------------

const DETECTION_SOURCE_FIELDS = ['rule_name', 'superseded', 'detection_evidence.p_value'];

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
    const { discovery_id: discoveryId, rule_names: ruleNames = [] } = eventSource;

    if (!discoveryId) {
      return { event_id: eventId, discovery: null, verdicts: [] };
    }

    const [discoveryResult, verdictsResult, detectionsResult] = await Promise.all([
      client.search({
        index: DISCOVERIES_INDEX,
        size: 1,
        query: { bool: { filter: [{ term: { discovery_id: discoveryId } }] } },
      }),
      client.search({
        index: VERDICTS_INDEX,
        size: 50,
        sort: [{ '@timestamp': 'asc' }],
        query: { bool: { filter: [{ term: { discovery_id: discoveryId } }] } },
      }),
      ruleNames.length > 0
        ? client.search({
            index: DETECTIONS_INDEX,
            size: 50,
            sort: [{ '@timestamp': 'desc' }],
            _source: DETECTION_SOURCE_FIELDS,
            collapse: { field: 'rule_name' },
            query: { bool: { filter: [{ terms: { rule_name: ruleNames } }] } },
          })
        : Promise.resolve(null),
    ]);

    let discovery: LifecycleDiscovery | null = null;
    if (discoveryResult.hits.hits.length) {
      const embeddedRuleNames = new Set(
        (esDiscoverySourceSchema.parse(discoveryResult.hits.hits[0]._source).detections ?? []).map(
          (d) => d.rule_name
        )
      );
      const extras = detectionsResult
        ? buildDetectionExtras(detectionsResult.hits.hits, embeddedRuleNames)
        : new Map();
      discovery = mapDiscovery(discoveryResult.hits.hits[0], extras);
    }

    const verdicts = verdictsResult.hits.hits.map(mapVerdict);

    return { event_id: eventId, discovery, verdicts };
  },
});

export const internalLifecycleRoutes = {
  ...getLifecycleRoute,
};
