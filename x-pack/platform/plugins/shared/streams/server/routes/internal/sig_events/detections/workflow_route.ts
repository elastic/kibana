/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { countDetectionAlerts } from '../../../../lib/sig_events/detections/count_detection_alerts';
import {
  buildRuleMetadataMap,
  resolveDetectionAlertsSource,
} from '../../../../lib/sig_events/detections/detection_alerts_source';
import {
  runDetectionChangePointAggregation,
  runDetectionRuleActivity,
  runDetectionRuleAlertWindows,
  runDetectionRuleChangePoint,
} from '../../../../lib/sig_events/detections/run_detection_change_point_aggregation';

const countAlertsRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/detections/workflow/_count_alerts',
  options: {
    access: 'internal',
    summary: 'Count alerts for the Detection workflow',
    description:
      'Counts alert or rule-event documents in a lookback window, resolving v1 vs v2 alerts source from advanced settings.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      lookback: z.string(),
      ruleUuid: z.string().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, getSpaceId }) => {
    const { scopedClusterClient, uiSettingsClient, getAlertingV2RulesClient, licensing } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const resolved = await resolveDetectionAlertsSource({
      uiSettingsClient,
      alertingV2RulesClient: await getAlertingV2RulesClient(),
      logger: server.logger.get('sigevents-detection-workflow'),
    });

    return countDetectionAlerts({
      esClient: scopedClusterClient.asCurrentUser,
      resolved,
      params: {
        lookback: params.body.lookback,
        ruleUuid: params.body.ruleUuid,
        spaceId: await getSpaceId(request),
      },
    });
  },
});

const changePointScanRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/detections/workflow/_change_point_scan',
  options: {
    access: 'internal',
    summary: 'Run per-rule change_point scan for the Detection workflow',
    description:
      'Executes the Detection workflow change_point aggregation against the resolved alerts source.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      lookback: z.string(),
      bucketInterval: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, getSpaceId }) => {
    const {
      scopedClusterClient,
      uiSettingsClient,
      getAlertingV2RulesClient,
      getKnowledgeIndicatorClient,
      licensing,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const logger = server.logger.get('sigevents-detection-workflow');
    const resolved = await resolveDetectionAlertsSource({
      uiSettingsClient,
      alertingV2RulesClient: await getAlertingV2RulesClient(),
      logger,
    });

    const kiClient = await getKnowledgeIndicatorClient();
    const queryLinks = await kiClient.getRuleBackedQueryLinks();
    const ruleMetadata = buildRuleMetadataMap(queryLinks);

    return runDetectionChangePointAggregation({
      esClient: scopedClusterClient.asCurrentUser,
      resolved,
      params: {
        lookback: params.body.lookback,
        bucketInterval: params.body.bucketInterval,
        spaceId: await getSpaceId(request),
      },
      ruleMetadata,
    });
  },
});

const ruleChangePointRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/detections/workflow/_rule_change_point',
  options: {
    access: 'internal',
    summary: 'Run quick-recovery change_point for one rule',
    description: 'Per-rule short-window change_point aggregation for the Detection workflow.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      ruleUuid: z.string(),
      lookback: z.string(),
      bucketInterval: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, getSpaceId }) => {
    const { scopedClusterClient, uiSettingsClient, getAlertingV2RulesClient, licensing } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const resolved = await resolveDetectionAlertsSource({
      uiSettingsClient,
      alertingV2RulesClient: await getAlertingV2RulesClient(),
      logger: server.logger.get('sigevents-detection-workflow'),
    });

    return runDetectionRuleChangePoint({
      esClient: scopedClusterClient.asCurrentUser,
      resolved,
      params: {
        ruleUuid: params.body.ruleUuid,
        lookback: params.body.lookback,
        bucketInterval: params.body.bucketInterval,
        spaceId: await getSpaceId(request),
      },
    });
  },
});

const ruleActivityRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/detections/workflow/_rule_activity',
  options: {
    access: 'internal',
    summary: 'Fetch per-rule activity windows for the Detection workflow',
    description: 'Returns activity histogram and peak counts for one rule.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      ruleUuid: z.string(),
      lookback: z.string(),
      windowInterval: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, getSpaceId }) => {
    const { scopedClusterClient, uiSettingsClient, getAlertingV2RulesClient, licensing } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const resolved = await resolveDetectionAlertsSource({
      uiSettingsClient,
      alertingV2RulesClient: await getAlertingV2RulesClient(),
      logger: server.logger.get('sigevents-detection-workflow'),
    });

    return runDetectionRuleActivity({
      esClient: scopedClusterClient.asCurrentUser,
      resolved,
      params: {
        ruleUuid: params.body.ruleUuid,
        lookback: params.body.lookback,
        windowInterval: params.body.windowInterval,
        spaceId: await getSpaceId(request),
      },
    });
  },
});

const ruleAlertWindowsRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/detections/workflow/_rule_alert_windows',
  options: {
    access: 'internal',
    summary: 'Compare current and reference alert windows for one rule',
    description: 'Day-over-day style alert window counts for quick-recovery logic in the Detection workflow.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      ruleUuid: z.string(),
      currentLookback: z.string(),
      referenceLookbackGte: z.string(),
      referenceLookbackLt: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, getSpaceId }) => {
    const { scopedClusterClient, uiSettingsClient, getAlertingV2RulesClient, licensing } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const resolved = await resolveDetectionAlertsSource({
      uiSettingsClient,
      alertingV2RulesClient: await getAlertingV2RulesClient(),
      logger: server.logger.get('sigevents-detection-workflow'),
    });

    return runDetectionRuleAlertWindows({
      esClient: scopedClusterClient.asCurrentUser,
      resolved,
      params: {
        ruleUuid: params.body.ruleUuid,
        currentLookback: params.body.currentLookback,
        referenceLookbackGte: params.body.referenceLookbackGte,
        referenceLookbackLt: params.body.referenceLookbackLt,
        spaceId: await getSpaceId(request),
      },
    });
  },
});

export const internalSigEventsDetectionsWorkflowRoutes = {
  ...countAlertsRoute,
  ...changePointScanRoute,
  ...ruleChangePointRoute,
  ...ruleActivityRoute,
  ...ruleAlertWindowsRoute,
};
