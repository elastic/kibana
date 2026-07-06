/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SignificantEventsWorkflowStatusResult } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';
import { FeatureNotEnabledError } from '../../../lib/errors/feature_not_enabled_error';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { resolveConnectorForSignificantEventsDiscovery } from '../../utils/resolve_connector_for_feature';

const discoveryExecuteRoute = createServerRoute({
  endpoint: 'POST /internal/streams/significant_events/discovery/_execute',
  params: z.object({
    body: z.discriminatedUnion('action', [
      z.object({ action: z.literal('trigger') }),
      z.object({ action: z.literal('cancel') }),
    ]),
  }),
  options: {
    access: 'internal',
    summary: 'Manually trigger the Significant Events pipeline',
    description:
      'Executes the Significant Events orchestrator workflow for the current space. Runs detection, discovery, and triage in sequence.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    workflowClients,
    getSpaceId,
    server,
    telemetry,
  }): Promise<{ executionId: string | null }> => {
    const { significantEventsDiscoveryClient } = workflowClients;
    if (!significantEventsDiscoveryClient) {
      throw new FeatureNotEnabledError(
        'Significant events discovery requires the workflows feature to be enabled'
      );
    }

    const { licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const spaceId = await getSpaceId(request);
    const { body } = params;

    if (body.action === 'trigger') {
      const connectorId = await resolveConnectorForSignificantEventsDiscovery({
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        request,
      });
      const { executionId, isNew } = await significantEventsDiscoveryClient.run({
        request,
        spaceId,
        inputs: { agentConnectorId: connectorId },
      });
      if (isNew) {
        telemetry.trackSignificantEventsDiscoveryTriggered({
          execution_id: executionId,
          space_id: spaceId,
        });
      }
      return { executionId };
    }

    const executionId = await significantEventsDiscoveryClient.cancel({ request, spaceId });
    return { executionId };
  },
});

const discoveryStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/significant_events/discovery/_status',
  params: z.object({}),
  options: {
    access: 'internal',
    summary: 'Get the status of the Significant Events discovery pipeline',
    description:
      'Returns the status of the most recent Significant Events orchestrator workflow execution for the current space.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    request,
    getScopedClients,
    workflowClients,
    getSpaceId,
    server,
  }): Promise<SignificantEventsWorkflowStatusResult> => {
    const { significantEventsDiscoveryClient } = workflowClients;
    if (!significantEventsDiscoveryClient) {
      throw new FeatureNotEnabledError('Significant events discovery is not available');
    }
    const { licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const spaceId = await getSpaceId(request);
    return significantEventsDiscoveryClient.getStatus({ spaceId });
  },
});

export const internalDiscoveryRoutes = {
  ...discoveryExecuteRoute,
  ...discoveryStatusRoute,
};
