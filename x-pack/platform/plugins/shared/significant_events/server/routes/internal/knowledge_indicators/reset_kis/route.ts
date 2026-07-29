/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import type { SignificantEventsResetResult } from '../../../../lib/significant_events/reset_stream_significant_events';
import { resetSignificantEvents } from '../../../../lib/significant_events/reset_stream_significant_events';

// TODO: Remove with the time-boxed follow-up to nightshift-program#651 once supported
// upgrade paths can no longer contain Significant Events v1 rules or alerts.
export const resetKIsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/significant_events/_reset_kis',
  options: {
    access: 'internal',
    summary: 'Clean up legacy Significant Events state',
    description:
      'One-time cleanup for a cluster that used experimental Significant Events alerting v1. ' +
      'Cluster-wide by design: acts on ALL spaces, not just the caller’s. ' +
      'Cancels in-flight onboarding, deletes all knowledge indicators and their linked v1 or v2 ' +
      'backing rules, and removes documents from `.alerts-streams.alerts-default` across every ' +
      'space. Does not modify detections, discoveries, events, memories, or `.rule-events`. ' +
      'Re-onboard streams via POST /internal/streams/{streamName}/onboarding/_execute to create ' +
      'new KIs and v2 rules. Blocked while Significant Events activity is paused (resume first), ' +
      'because reset deletes rules that Pause recorded for Resume.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    request,
    getScopedClients,
    server,
    workflowClients,
    logger,
    maintenanceService,
  }): Promise<SignificantEventsResetResult> => {
    const { streamsKIsOnboardingClient } = workflowClients;
    if (!streamsKIsOnboardingClient) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const scopedClients = await getScopedClients({ request });
    const { licensing, scopedClusterClient, deleteLegacyRules } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    return resetSignificantEvents({
      kiClient,
      esClient: scopedClusterClient.asCurrentUser,
      logger: logger.get('significant_events'),
      request,
      streamsKIsOnboardingClient,
      deleteLegacyRules,
    });
  },
});

export const internalKIResetKisRoutes = {
  ...resetKIsRoute,
};
