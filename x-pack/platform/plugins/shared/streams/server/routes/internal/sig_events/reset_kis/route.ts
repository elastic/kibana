/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StreamsSigEventsResetResult } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { FeatureNotEnabledError } from '../../../../lib/streams/errors/feature_not_enabled_error';
import { resetSignificantEvents } from '../../../../lib/sig_events/reset_stream_sig_events';

export const sigEventsResetKisRoute = createServerRoute({
  endpoint: 'POST /internal/streams/sig_events/_reset_kis',
  options: {
    access: 'internal',
    summary: 'Reset SigEvents KIs for alerting v2 upgrade',
    description:
      'Prepares a cluster that onboarded Significant Events on experimental alerting v1 for alerting v2. ' +
      'Cancels in-flight onboarding, deletes all knowledge indicators and backing alerting rules, and ' +
      'removes documents from `.alerts-streams.alerts-default`. Does not modify detections, discoveries, ' +
      'events, memories, or `.rule-events`. Re-onboard streams via POST ' +
      '/internal/streams/{streamName}/onboarding/_execute to create new KIs and v2 rules.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({}).optional().default({}),
  }),
  handler: async ({
    request,
    getScopedClients,
    server,
    workflowClients,
    logger,
  }): Promise<StreamsSigEventsResetResult> => {
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

export const internalSigEventsResetKisRoutes = {
  ...sigEventsResetKisRoute,
};
