/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { OnboardingStep, OnboardingStatus, type OnboardingStatusResult } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import type { OnboardingWorkflowInputs } from '../../../../lib/workflows/onboarding_workflow_client';

const timestampFromString = z.string().transform((input) => new Date(input).getTime());

const mapStepsToSkipFlags = (
  steps: OnboardingStep[]
): { skipFeatures: boolean; skipQueries: boolean } => ({
  skipFeatures: !steps.includes(OnboardingStep.FeaturesIdentification),
  skipQueries: !steps.includes(OnboardingStep.QueriesGeneration),
});

export const onboardingExecuteRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/onboarding/_execute',
  options: {
    access: 'internal',
    summary: 'Onboard stream',
    description:
      'Generate features and queries for a stream, the data that is necessary for insights discovery.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule').describe('Schedule a new onboarding workflow run'),
        from: timestampFromString,
        to: timestampFromString,
        steps: z
          .array(z.enum(OnboardingStep))
          .optional()
          .default([OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration])
          .describe(
            'Optional list of steps to perform as part of stream onboarding in the specified sequence. By default it will execute all steps.'
          ),
        connectors: z
          .object({
            features: z
              .string()
              .max(255)
              .optional()
              .describe('Connector ID for features identification.'),
            queries: z
              .string()
              .max(255)
              .optional()
              .describe('Connector ID for queries generation.'),
          })
          .optional()
          .describe(
            'Optional per-step connector overrides. When omitted the server resolves connectors from the inference feature registry.'
          ),
      }),
      z.object({
        action: z.literal('cancel').describe('Cancel an in-progress onboarding workflow'),
      }),
    ]),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    onboardingClient,
  }): Promise<OnboardingStatusResult> => {
    if (!onboardingClient) {
      throw new StatusError('Workflows management is not available', 503);
    }

    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { streamName },
      body,
    } = params;

    if (body.action === 'schedule') {
      const { skipFeatures, skipQueries } = mapStepsToSkipFlags(body.steps);

      const inputs: OnboardingWorkflowInputs = {
        streamName,
        skipFeatures,
        skipQueries,
        featuresStart: body.from,
        featuresEnd: body.to,
        ...(body.connectors?.features && { featuresConnectorId: body.connectors.features }),
        ...(body.connectors?.queries && { queriesConnectorId: body.connectors.queries }),
      };

      await onboardingClient.run({ inputs, request });

      return { status: OnboardingStatus.InProgress };
    }

    // action === 'cancel'
    await onboardingClient.cancel({ streamName, request });

    return { status: OnboardingStatus.Canceled };
  },
});

export const onboardingStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{streamName}/onboarding/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of stream onboarding',
    description: 'Check the status of onboarding progress for a stream',
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
    onboardingClient,
  }): Promise<OnboardingStatusResult> => {
    if (!onboardingClient) {
      throw new StatusError('Workflows management is not available', 503);
    }

    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { streamName },
    } = params;

    const { executionId: _, ...statusResult } = await onboardingClient.getStatus({ streamName });
    return statusResult;
  },
});

export const internalOnboardingRoutes = {
  ...onboardingExecuteRoute,
  ...onboardingStatusRoute,
};
