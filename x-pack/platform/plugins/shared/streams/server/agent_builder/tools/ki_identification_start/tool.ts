/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { OnboardingStep } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../../routes/types';
import { classifyError } from '../error_utils';
import { startKiIdentificationToolHandler } from './handler';

export const STREAMS_KI_IDENTIFICATION_START_TOOL_ID =
  'platform.streams.sig_events.ki_identification_start';

const onboardingStartSchema = z.object({
  stream_name: z.string().describe('Target stream name, e.g. "logs.ecs.nginx".'),
  steps: z
    .array(z.enum(OnboardingStep))
    .optional()
    .default([OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration])
    .describe('Optional ordered KI identification steps for the background task.'),
  connectors: z
    .object({
      features: z.string().optional(),
      queries: z.string().optional(),
    })
    .optional(),
});

export const createKiIdentificationStartTool = ({
  getScopedClients,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  telemetry: EbtTelemetryClient;
}): BuiltinSkillBoundedTool<typeof onboardingStartSchema> => ({
  id: STREAMS_KI_IDENTIFICATION_START_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Start stream Knowledge Indicator (KI) identification as a background task.

    This tool schedules the KI identification background task and returns immediately with a
    Kibana path to the Significant Events page where progress can be tracked.

    Use this tool to:
    - Kick off KI identification for a stream
    - Run feature identification and query generation steps in a background task
    - Get a direct Kibana path to track background task progress in the Streams UI

    Returns:
    - On success: \`{ kibanaPath: "/app/streams/<stream>/management/significantEvents" }\`
    - On failure: an error result with \`message\`, \`operation\`, and \`likely_cause\`
  `,
  schema: onboardingStartSchema,
  handler: async ({ stream_name: streamName, steps, connectors }, { request }) => {
    try {
      const { taskClient } = await getScopedClients({ request });
      const resolvedSteps = steps ?? [
        OnboardingStep.FeaturesIdentification,
        OnboardingStep.QueriesGeneration,
      ];

      const data = await startKiIdentificationToolHandler({
        streamName,
        steps: resolvedSteps,
        connectors,
        taskClient,
        request,
      });

      telemetry.trackAgentToolKiIdentificationStarted({
        success: true,
        stream_name: streamName,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      telemetry.trackAgentToolKiIdentificationStarted({
        success: false,
        stream_name: streamName,
        error_message: message,
      });

      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to start KI identification background task for "${streamName}": ${message}`,
              stream: streamName,
              operation: 'ki_identification_start',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
