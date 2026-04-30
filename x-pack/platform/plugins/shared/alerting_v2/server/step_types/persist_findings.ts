/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server/step_registry/types';
import { RuleDoctorInsightsClient } from '../lib/rule_doctor_insights_client/rule_doctor_insights_client';
import {
  ruleDoctorInsightDocSchema,
  type RuleDoctorInsightDoc,
} from '../resources/indices/rule_doctor_insights';
import type { LoggerServiceContract } from '../lib/services/logger_service/logger_service';

const persistFindingsInputSchema = z.object({
  insights: z
    .array(z.unknown())
    .describe('Insight documents to validate and persist'),
  dismiss_ids: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Insight IDs to mark as dismissed'),
  space_id: z.string().describe('Kibana space ID for composite document IDs'),
});

const persistFindingsOutputSchema = z.object({
  indexed: z.number().describe('Number of insights successfully indexed'),
  failed: z.number().describe('Number of insights that failed to index'),
  dismissed: z.number().describe('Number of insights dismissed'),
});

function adaptLogger(stepLogger: {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}): LoggerServiceContract {
  return {
    debug: ({ message }) => stepLogger.debug(message),
    info: ({ message }) => stepLogger.info(message),
    warn: ({ message }) => stepLogger.warn(message),
    error: ({ error }) => stepLogger.error(error.message, error),
  };
}

export const persistFindingsStepDefinition = createServerStepDefinition({
  id: 'alerting_v2.persist_findings',
  label: 'Persist Rule Doctor Findings',
  description: 'Bulk indexes validated insights and dismisses stale ones in the Rule Doctor index',
  category: StepCategory.Elasticsearch,
  inputSchema: persistFindingsInputSchema,
  outputSchema: persistFindingsOutputSchema,
  handler: async (context) => {
    const { insights = [], dismiss_ids: dismissIds = [], space_id: spaceId } = context.input;
    const esClient = context.contextManager.getScopedEsClient();
    const logger = adaptLogger(context.logger);
    const client = new RuleDoctorInsightsClient(esClient, logger);

    const validated: RuleDoctorInsightDoc[] = [];
    let schemaFailed = 0;

    for (const raw of insights) {
      const result = ruleDoctorInsightDocSchema.safeParse(raw);
      if (result.success) {
        validated.push(result.data);
      } else {
        schemaFailed++;
        logger.warn({
          message: `persist_findings: dropping insight that failed validation: ${result.error.message}`,
        });
      }
    }

    const persistResult = await client.persistFindings({
      insights: validated,
      dismissIds,
      spaceId,
    });

    return {
      output: {
        indexed: persistResult.indexed,
        failed: persistResult.failed + schemaFailed,
        dismissed: persistResult.dismissed,
      },
    };
  },
});
