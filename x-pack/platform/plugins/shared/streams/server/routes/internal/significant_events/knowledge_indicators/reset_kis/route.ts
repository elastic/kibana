/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_API_PRIVILEGES } from '../../../../../../common/constants';
import { createServerRoute } from '../../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../../utils/assert_significant_events_access';
import { FeatureNotEnabledError } from '../../../../../lib/streams/errors/feature_not_enabled_error';
import type { StreamsSignificantEventsResetResult } from '../../../../../lib/significant_events/reset_stream_sig_events';
import { resetSignificantEvents } from '../../../../../lib/significant_events/reset_stream_sig_events';

export const significantEventsResetKisRoute = createServerRoute({
  endpoint: 'POST /internal/streams/significant_events/_reset_kis',
  options: {
    access: 'internal',
    summary: 'Reset Significant Events KIs for alerting v2 upgrade',
    description:
      'Prepares a cluster that onboarded Significant Events on experimental alerting v1 for alerting v2. ' +
      'Cluster-wide by design: acts on ALL spaces, not just the caller’s. ' +
      'Cancels in-flight onboarding, deletes all knowledge indicators and backing alerting rules, and ' +
      'removes documents from `.alerts-streams.alerts-default` across every space. Does not modify ' +
      'detections, discoveries, events, memories, or `.rule-events`. Re-onboard streams via POST ' +
      '/internal/streams/{streamName}/onboarding/_execute to create new KIs and v2 rules.',
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
  }): Promise<StreamsSignificantEventsResetResult> => {
    const { streamsKIsOnboardingClient } = workflowClients;
    if (!streamsKIsOnboardingClient) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient, scopedClusterClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    return resetSignificantEvents({
      kiClient,
      esClient: scopedClusterClient.asCurrentUser,
      logger: logger.get('significant_events'),
      request,
      streamsKIsOnboardingClient,
    });
  },
});

export const internalSignificantEventsResetKisRoutes = {
  ...significantEventsResetKisRoute,
};
