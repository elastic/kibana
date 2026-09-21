/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import type { SignificantEventsResetResult } from '../../../../lib/significant_events/reset_stream_significant_events';
import { resetSignificantEvents } from '../../../../lib/significant_events/reset_stream_significant_events';

// TODO(nightshift-program#1306 follow-up): this route is now space-scoped, not cluster-wide.
// Pre-v3 KI documents (no kibana.space_ids) are invisible and expire via data_retention.
// A proper cluster-wide reset that iterates spaces ships with the space-aware reset rewrite.
const resetKIsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/significant_events/_reset_kis',
  options: {
    access: 'internal',
    summary: 'Clean up Significant Events state in the current space',
    description:
      'Cleanup for Significant Events state in the caller\u2019s space. ' +
      'Cancels in-flight onboarding, deletes knowledge indicators and their linked v1 or v2 ' +
      'backing rules visible in this space, and removes v1 alert documents from ' +
      '`.alerts-streams.alerts-default` (cluster-wide). ' +
      'Does not modify detections, discoveries, events, memories, or `.rule-events`. ' +
      'Re-onboard streams via POST /internal/streams/{streamName}/onboarding/_execute to create ' +
      'new KIs and v2 rules. Blocked while Significant Events activity is paused (resume first), ' +
      'because reset deletes rules that Pause recorded for Resume.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
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
      logger: logger.get('significantEvents'),
      request,
      streamsKIsOnboardingClient,
      deleteLegacyRules,
    });
  },
});

export const internalKIResetKisRoutes = {
  ...resetKIsRoute,
};
