/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { OnboardingStep } from '@kbn/streams-schema';
import {
  STREAMS_API_PRIVILEGES,
  KI_ONBOARDING_WORKFLOW_UUID,
} from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import {
  WorkflowExecutionClient,
  type WorkflowExecutionResult,
} from '../../../../lib/workflows/workflow_execution_client';

const timestampFromString = z.string().transform((input) => new Date(input).getTime());

const onboardingRunRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/onboarding/_run',
  options: {
    access: 'internal',
    summary: 'Run stream onboarding workflow',
    description:
      'Triggers the onboarding workflow that generates features and queries for a stream.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
    body: z.object({
      from: timestampFromString,
      to: timestampFromString,
      steps: z
        .array(z.nativeEnum(OnboardingStep))
        .optional()
        .default([OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration])
        .describe(
          'Optional list of steps to perform as part of stream onboarding in the specified sequence. By default it will execute all steps.'
        ),
      connectors: z
        .object({
          features: z.string().optional().describe('Connector ID for features identification.'),
          queries: z.string().optional().describe('Connector ID for queries generation.'),
        })
        .optional()
        .describe(
          'Optional per-step connector overrides. When omitted the server resolves connectors from the inference feature registry.'
        ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowsManagementApi,
  }): Promise<WorkflowExecutionResult> => {
    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowsManagementApi) {
      throw new Error('Workflows management is not available');
    }

    const { streamName } = params.path;
    const { from, to, steps, connectors } = params.body;

    const client = new WorkflowExecutionClient(workflowsManagementApi, KI_ONBOARDING_WORKFLOW_UUID);

    const skipFeatures = !steps.includes(OnboardingStep.FeaturesIdentification);
    const skipQueries = !steps.includes(OnboardingStep.QueriesGeneration);

    return client.run(
      {
        streamName,
        featuresStart: from,
        featuresEnd: to,
        skipFeatures,
        skipQueries,
        ...(connectors?.features && { featuresConnectorId: connectors.features }),
        ...(connectors?.queries && { queriesConnectorId: connectors.queries }),
      },
      request
    );
  },
});

const onboardingExecutionRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{streamName}/onboarding/_execution',
  options: {
    access: 'internal',
    summary: 'Get the latest onboarding workflow execution for a stream',
    description: 'Returns the latest workflow execution status and output for the given stream.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowsManagementApi,
  }): Promise<WorkflowExecutionResult> => {
    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowsManagementApi) {
      throw new Error('Workflows management is not available');
    }

    const { streamName } = params.path;
    const client = new WorkflowExecutionClient(workflowsManagementApi, KI_ONBOARDING_WORKFLOW_UUID);

    return client.getLatestExecution(streamName);
  },
});

const onboardingCancelRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/onboarding/_cancel',
  options: {
    access: 'internal',
    summary: 'Cancel running onboarding workflow for a stream',
    description:
      'Cancels the currently running onboarding workflow execution for the given stream.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowsManagementApi,
  }): Promise<{ acknowledged: boolean }> => {
    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowsManagementApi) {
      throw new Error('Workflows management is not available');
    }

    const { streamName } = params.path;
    const client = new WorkflowExecutionClient(workflowsManagementApi, KI_ONBOARDING_WORKFLOW_UUID);

    await client.cancelExecution(streamName);

    return { acknowledged: true };
  },
});

export const internalOnboardingRoutes = {
  ...onboardingRunRoute,
  ...onboardingExecutionRoute,
  ...onboardingCancelRoute,
};
