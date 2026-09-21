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
import { getAllSpaceIds } from '../../../../lib/spaces/get_all_space_ids';
import {
  resetKnowledgeIndicators,
  type KnowledgeIndicatorsResetResult,
} from '../../../../lib/knowledge_indicators/admin/reset_knowledge_indicators';

// TODO: Remove with the time-boxed follow-up to nightshift-program#651 once supported
// upgrade paths can no longer contain Significant Events v1 rules or alerts, or
// knowledge indicators keyed by `stream.name`.
const resetKnowledgeIndicatorsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/knowledge_indicators/_reset',
  options: {
    access: 'internal',
    summary: 'Wipe all knowledge indicators and their rules',
    description:
      'Destructive, cluster-wide reset of the knowledge indicator system. Acts on ALL spaces, not ' +
      'just the caller’s. Cancels in-flight onboarding, deletes every knowledge indicator revision ' +
      '(including legacy documents keyed by stream name, which are otherwise invisible), deletes ' +
      'every Nightshift-owned Alerting v2 rule in every space, removes Significant Events v1 rules ' +
      'and the documents in `.alerts-streams.alerts-default`. Nothing is migrated: re-onboard your ' +
      'streams afterwards to create new knowledge indicators and rules. Does not modify detections, ' +
      'discoveries, events, or `.rule-events`. Blocked while Significant Events activity is paused ' +
      '(resume first), because reset deletes rules that Pause recorded for Resume.',
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
  }): Promise<KnowledgeIndicatorsResetResult> => {
    const { streamsKIsOnboardingClient } = workflowClients;
    if (!streamsKIsOnboardingClient) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { licensing, scopedClusterClient, deleteLegacyRules, getRulesManagementClientInSpace } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    return resetKnowledgeIndicators({
      // Internal user: the hidden knowledge indicators stream is plugin-owned, like every
      // other write the KI client makes to it.
      esClient: scopedClusterClient.asInternalUser,
      logger: logger.get('significantEvents'),
      request,
      streamsKIsOnboardingClient,
      getAllSpaceIds: () =>
        getAllSpaceIds({ request, spacesService: server.spaces?.spacesService }),
      getRulesManagementClientInSpace,
      deleteLegacyRules,
    });
  },
});

export const internalKIAdminRoutes = {
  ...resetKnowledgeIndicatorsRoute,
};
