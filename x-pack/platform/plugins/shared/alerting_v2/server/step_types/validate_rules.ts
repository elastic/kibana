/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server/step_registry/types';
import {
  ruleDoctorInsightDocSchema,
  type RuleDoctorInsightDoc,
} from '../resources/indices/rule_doctor_insights';

const validateRulesInputSchema = z.object({
  insights: z.array(z.unknown()).describe('Raw AI-generated insight objects to validate'),
  space_id: z.string().describe('Kibana space ID to assign to validated insights'),
  execution_id: z.string().describe('Execution ID for this analysis run'),
});

const validateRulesOutputSchema = z.object({
  validInsights: z.array(z.unknown()).describe('Insights that passed schema validation'),
  invalidInsights: z
    .array(
      z.object({
        raw: z.unknown(),
        error: z.string(),
      })
    )
    .describe('Insights that failed validation with error details'),
  hasInvalid: z.boolean().describe('Whether any insights failed validation'),
});

export const validateRulesStepDefinition = createServerStepDefinition({
  id: 'alerting_v2.validate_rules',
  label: 'Validate Rule Doctor Insights',
  description: 'Validates AI-generated insight objects against the Rule Doctor insight schema',
  category: StepCategory.Data,
  inputSchema: validateRulesInputSchema,
  outputSchema: validateRulesOutputSchema,
  handler: async (context) => {
    const { insights, space_id: spaceId, execution_id: executionId } = context.input;
    const validInsights: RuleDoctorInsightDoc[] = [];
    const invalidInsights: Array<{ raw: unknown; error: string }> = [];

    for (const raw of insights) {
      const rawObj = (raw != null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const enriched = {
        ...rawObj,
        space_id: spaceId,
        execution_id: executionId,
        insight_id: rawObj.insight_id || `insight-${uuidv4().slice(0, 8)}`,
        '@timestamp': rawObj['@timestamp'] || new Date().toISOString(),
        status: rawObj.status || 'open',
      };

      const result = ruleDoctorInsightDocSchema.safeParse(enriched);
      if (result.success) {
        validInsights.push(result.data);
      } else {
        invalidInsights.push({
          raw,
          error: result.error.message,
        });
      }
    }

    context.logger.debug(
      `Validated ${validInsights.length} insights, ${invalidInsights.length} invalid`
    );

    return {
      output: { validInsights, invalidInsights, hasInvalid: invalidInsights.length > 0 },
    };
  },
});
