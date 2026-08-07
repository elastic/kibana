/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { QueryLink } from '@kbn/significant-events-schema';
import {
  MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS,
  MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS,
  STREAMS_API_PRIVILEGES,
} from '../../../../common/constants';
import { StatusError } from '../../../lib/errors/status_error';
import { createSignificantEventsTracedEsClient } from '../../../lib/significant_events/create_significant_events_traced_es_client';
import {
  CRITICAL_ANALYSIS_PROFILE,
  DEFAULT_ANALYSIS_PROFILE,
  analysisProfileForQuery,
  getAnalysisProfileConfig,
  getDurationMinutes,
  getIdleGateLookback,
  parseLookbackMinutes,
  type AnalysisProfileConfig,
  type AnalysisProfileId,
} from '../../../lib/significant_events/rules/schedule';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

interface AnalysisProfileGroup {
  config: AnalysisProfileConfig;
  queryLinks: QueryLink[];
}

const groupQueryLinksByAnalysisProfile = (queryLinks: QueryLink[]): AnalysisProfileGroup[] => {
  const groups = new Map<AnalysisProfileId, AnalysisProfileGroup>();

  for (const queryLink of queryLinks) {
    const config = getAnalysisProfileConfig(queryLink.query);
    const group = groups.get(config.profile) ?? { config, queryLinks: [] };
    group.queryLinks.push(queryLink);
    groups.set(config.profile, group);
  }

  return Array.from(groups.values());
};

const countRulesForProfile = (queryLinks: QueryLink[], profile: AnalysisProfileId): number =>
  queryLinks.filter((queryLink) => analysisProfileForQuery(queryLink.query) === profile).length;

/** Parse the Detection workflow lookback (`now-<N>m`), surfacing malformed input as 400. */
function assertDetectionLookback(lookback: string): number {
  try {
    return parseLookbackMinutes(lookback);
  } catch (err) {
    throw new StatusError(err instanceof Error ? err.message : String(err), 400);
  }
}

/**
 * Validate Detection workflow lookback / bucketInterval: whole positive minutes,
 * lookback form `now-<N>m`, and enough outer buckets for change_point (≥22).
 */
function assertDetectionAnalysisWindow(lookback: string, bucketInterval: string): void {
  const lookbackMinutes = assertDetectionLookback(lookback);
  let bucketMinutes: number;
  try {
    bucketMinutes = getDurationMinutes(bucketInterval);
  } catch (err) {
    throw new StatusError(err instanceof Error ? err.message : String(err), 400);
  }
  if (lookbackMinutes % bucketMinutes !== 0) {
    throw new StatusError(
      `Detection lookback (${lookback}) must be an exact multiple of bucketInterval (${bucketInterval})`,
      400
    );
  }
  const bucketCount = lookbackMinutes / bucketMinutes;
  if (
    bucketCount < MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS ||
    bucketCount > MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS
  ) {
    throw new StatusError(
      `Detection lookback (${lookback}) / bucketInterval (${bucketInterval}) must yield between ${MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS} and ${MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS} buckets, got ${bucketCount}`,
      400
    );
  }
}

const countAlertsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/detections/workflow/_count_alerts',
  options: {
    access: 'internal',
    summary: 'Count alerts for the Detection workflow',
    description:
      'Counts Alerting v2 signal events in `.rule-events` for the idle gate. The request lookback is the critical analysis duration; the query is widened to the earliest write-time bound across critical and default analysis profiles.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      lookback: z.string().max(64),
      ruleUuid: z.string().max(256).optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, getSpaceId, logger }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    // Same 400-on-malformed contract as the change_point scan route.
    assertDetectionLookback(params.body.lookback);

    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });
    const { alertsReader } = await scopedClients.getSignificantEventsAlertingContext();
    // Widen past the critical lookback so default-profile activity in the
    // longer 125m window still keeps the Detection workflow awake.
    const idleLookback = getIdleGateLookback(params.body.lookback);
    const count = await alertsReader.countAlerts(esClient, {
      lookback: idleLookback,
      ruleUuid: params.body.ruleUuid,
      spaceId: await getSpaceId(request),
    });

    return { alertIndex: alertsReader.index, count };
  },
});

const changePointScanRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/detections/workflow/_change_point_scan',
  options: {
    access: 'internal',
    summary: 'Run per-rule change_point scan for the Detection workflow',
    description:
      'Executes the Detection workflow change_point aggregation against Alerting v2 signal events in `.rule-events`.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      lookback: z.string().max(64),
      bucketInterval: z.string().max(64),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, getSpaceId, telemetry, logger }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    assertDetectionAnalysisWindow(params.body.lookback, params.body.bucketInterval);

    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });
    const spaceId = await getSpaceId(request);
    const [kiClient, sigEventsContext] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      scopedClients.getSignificantEventsAlertingContext(),
    ]);
    const queryLinks = await kiClient.getRuleBackedQueryLinks();

    const defaultConfig = getAnalysisProfileConfig({ severity_score: 0 });
    const criticalLookback = params.body.lookback;
    const criticalBucketInterval = params.body.bucketInterval;

    const startedAt = Date.now();
    const scanResults = await Promise.all(
      groupQueryLinksByAnalysisProfile(queryLinks).map(({ config, queryLinks: groupedLinks }) => {
        const isCritical = config.profile === CRITICAL_ANALYSIS_PROFILE;
        return sigEventsContext.alertsReader.runChangePointScan(
          esClient,
          {
            // Critical uses workflow inputs; default keeps its fixed profile.
            lookback: isCritical ? criticalLookback : config.lookback,
            bucketInterval: isCritical ? criticalBucketInterval : config.bucketInterval,
            ruleIds: groupedLinks.map((queryLink) => queryLink.rule_id),
            spaceId,
          },
          groupedLinks
        );
      })
    );
    const durationMs = Date.now() - startedAt;
    const took = scanResults.reduce((sum, result) => sum + (result.took ?? 0), 0);
    const buckets = scanResults.flatMap((result) => result.by_rule.buckets);
    const aggregations = { by_rule: { buckets } };
    const criticalRuleCount = countRulesForProfile(queryLinks, CRITICAL_ANALYSIS_PROFILE);
    const defaultRuleCount = countRulesForProfile(queryLinks, DEFAULT_ANALYSIS_PROFILE);

    telemetry.trackSignificantEventsDetectionScan({
      took_ms: took,
      duration_ms: durationMs,
      rules_requested: queryLinks.length,
      rules_scanned: buckets.length,
      critical_rule_count: criticalRuleCount,
      default_rule_count: defaultRuleCount,
      alerting_engine: 'v2',
      alerts_source_index: sigEventsContext.alertsReader.index,
      lookback: criticalLookback,
      bucket_interval: criticalBucketInterval,
      default_lookback: defaultConfig.lookback,
      default_bucket_interval: defaultConfig.bucketInterval,
      space_id: spaceId,
    });

    return { alertIndex: sigEventsContext.alertsReader.index, aggregations };
  },
});

export const internalDetectionsWorkflowRoutes = {
  ...countAlertsRoute,
  ...changePointScanRoute,
};
