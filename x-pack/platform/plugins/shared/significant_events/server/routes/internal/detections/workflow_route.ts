/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { QueryLink } from '@kbn/significant-events-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createSignificantEventsTracedEsClient } from '../../../lib/significant_events/create_significant_events_traced_es_client';
import {
  CRITICAL_RULE_INTERVAL,
  DEFAULT_RULE_INTERVAL,
  getRuleDetectionSchedule,
  scheduleIntervalForQuery,
  type RuleDetectionSchedule,
} from '../../../lib/significant_events/rules/schedule';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

interface RuleScheduleGroup {
  schedule: RuleDetectionSchedule;
  queryLinks: QueryLink[];
}

const groupQueryLinksByRuleSchedule = (queryLinks: QueryLink[]): RuleScheduleGroup[] => {
  const groups = new Map<number, RuleScheduleGroup>();

  for (const queryLink of queryLinks) {
    const schedule = getRuleDetectionSchedule(queryLink.query);
    const group = groups.get(schedule.interval_minutes) ?? { schedule, queryLinks: [] };
    group.queryLinks.push(queryLink);
    groups.set(schedule.interval_minutes, group);
  }

  return Array.from(groups.values());
};

const countRulesForInterval = (queryLinks: QueryLink[], interval: string): number =>
  queryLinks.filter((queryLink) => scheduleIntervalForQuery(queryLink.query) === interval).length;

const countAlertsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/detections/workflow/_count_alerts',
  options: {
    access: 'internal',
    summary: 'Count alerts for the Detection workflow',
    description: 'Counts Alerting v2 signal events in `.rule-events` for a lookback window.',
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

    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });
    const { alertsReader } = await scopedClients.getSignificantEventsAlertingContext();
    const count = await alertsReader.countAlerts(esClient, {
      lookback: params.body.lookback,
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

    const startedAt = Date.now();
    const scanResults = await Promise.all(
      groupQueryLinksByRuleSchedule(queryLinks).map(({ schedule, queryLinks: groupedLinks }) => {
        const criticalCadence = schedule.interval_minutes === 1;
        return sigEventsContext.alertsReader.runChangePointScan(
          esClient,
          {
            lookback: criticalCadence ? params.body.lookback : schedule.lookback,
            bucketInterval: criticalCadence ? params.body.bucketInterval : schedule.bucket_interval,
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
    const criticalRuleCount = countRulesForInterval(queryLinks, CRITICAL_RULE_INTERVAL);
    const defaultRuleCount = countRulesForInterval(queryLinks, DEFAULT_RULE_INTERVAL);

    telemetry.trackSignificantEventsDetectionScan({
      took_ms: took,
      duration_ms: durationMs,
      rules_scanned: buckets.length,
      critical_rule_count: criticalRuleCount,
      default_rule_count: defaultRuleCount,
      alerting_engine: 'v2',
      alerts_source_index: sigEventsContext.alertsReader.index,
      lookback: params.body.lookback,
      bucket_interval: params.body.bucketInterval,
      space_id: spaceId,
    });

    return { alertIndex: sigEventsContext.alertsReader.index, aggregations };
  },
});

export const internalDetectionsWorkflowRoutes = {
  ...countAlertsRoute,
  ...changePointScanRoute,
};
