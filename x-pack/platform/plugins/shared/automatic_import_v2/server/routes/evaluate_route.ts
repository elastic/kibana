/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, LoggerFactory } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { AutomaticImportV2PluginRequestHandlerContext } from '../types';
import { buildAutomaticImportResponse } from './utils';
import { AUTOMATIC_IMPORT_API_PRIVILEGES } from '../feature';
import { AgentService } from '../services/agents/agent_service';
import { AutomaticImportSamplesIndexService } from '../services/samples_index/index_service';
import type { PromptOverrideKey } from '../agents/types';

const EvaluateRequestBodySchema = z.object({
  samples: z.array(z.string()).min(1),
  connectorId: z.string().min(1),
  promptOverrides: z.record(z.string(), z.string()).optional(),
});

const EVALUATION_INTEGRATION_ID = 'gepa-eval';
const EVALUATION_DATA_STREAM_ID = 'gepa-eval';

export const registerEvaluateRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) => {
  const loggerFactory: LoggerFactory = {
    get: (_name: string) => logger,
  };

  router.versioned
    .post({
      access: 'internal',
      path: '/internal/automatic_import_v2/evaluate',
      security: {
        authz: {
          requiredPrivileges: [`${AUTOMATIC_IMPORT_API_PRIVILEGES.MANAGE}`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(EvaluateRequestBodySchema),
          },
        },
      },
      async (context, request, response) => {
        try {
          const automaticImportv2 = await context.automaticImportv2;
          const { esClient, inference } = automaticImportv2;
          const { samples, connectorId, promptOverrides } = request.body;

          const model = await inference.getChatModel({
            request,
            connectorId,
            chatModelOptions: {
              temperature: 0.05,
              maxRetries: 1,
              disableStreaming: true,
              maxConcurrency: 50,
              telemetryMetadata: { pluginId: 'automatic_import_v2' },
            },
          });

          const samplesIndexService = new AutomaticImportSamplesIndexService(loggerFactory);
          const agentService = new AgentService(samplesIndexService, loggerFactory);

          const result = await agentService.invokeAutomaticImportAgent(
            EVALUATION_INTEGRATION_ID,
            EVALUATION_DATA_STREAM_ID,
            esClient,
            model,
            undefined,
            {
              samples,
              promptOverrides: promptOverrides as Partial<Record<PromptOverrideKey, string>> | undefined,
            }
          );

          return response.ok({
            body: {
              current_pipeline: result.state.current_pipeline,
              pipeline_generation_results: result.state.pipeline_generation_results,
              pipeline_validation_results: result.state.pipeline_validation_results,
            },
          });
        } catch (err) {
          logger.error(`evaluate route: Caught error:`, err);
          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );
};
