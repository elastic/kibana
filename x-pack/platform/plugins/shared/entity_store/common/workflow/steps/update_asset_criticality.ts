/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../domain/definitions/entity_schema';
import { AssetCriticalityLevel } from '../../domain/definitions/entity.gen';

export const UPDATE_ASSET_CRITICALITY_STEP_ID = 'entityStore.updateAssetCriticality' as const;

const MAX_ENTITY_ID_VALUE_LENGTH = 1000;

/**
 * Workflow messages are typically short text strings. We use 1500 here to
 * safely accommodate these messages that may include the entity ID (max 1000). The server handler
 * truncates its output message to this same limit, since it interpolates the (up to
 * `MAX_ENTITY_ID_VALUE_LENGTH`-long) `entity_id` and, on failure, an upstream error message of
 * unbounded length.
 */
export const MAX_WORKFLOW_MESSAGE_LENGTH = 1500;

export const updateAssetCriticalityInputSchema = z.object({
  entity_type: EntityType.describe(
    'The Entity Store entity type, e.g. "host", "user" or "service"'
  ),
  entity_id: z
    .string()
    .min(1)
    .max(MAX_ENTITY_ID_VALUE_LENGTH)
    .describe('The Entity Store entity ID (EUID), e.g. "host:my-host"'),
  criticality_level: AssetCriticalityLevel.nullable().describe(
    'The criticality level ("low_impact", "medium_impact", "high_impact", "extreme_impact") to assign to the entity. Pass `null` to remove the existing criticality level.'
  ),
});

export const updateAssetCriticalityOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const updateAssetCriticalityConfigSchema = z.object({
  'recalculate-risk-score': z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to trigger a risk score recalculation for the entity after updating its criticality. Defaults to true.'
    ),
});

export const updateAssetCriticalityStepCommonDefinition: CommonStepDefinition<
  typeof updateAssetCriticalityInputSchema,
  typeof updateAssetCriticalityOutputSchema,
  typeof updateAssetCriticalityConfigSchema
> = {
  id: UPDATE_ASSET_CRITICALITY_STEP_ID,
  label: i18n.translate('entityStore.workflow.steps.updateAssetCriticality.label', {
    defaultMessage: 'Update Asset Criticality',
  }),
  description: i18n.translate('entityStore.workflow.steps.updateAssetCriticality.description', {
    defaultMessage: 'Set the asset criticality level for an Entity Store entity.',
  }),
  category: StepCategory.KibanaEntityStore,
  inputSchema: updateAssetCriticalityInputSchema,
  outputSchema: updateAssetCriticalityOutputSchema,
  configSchema: updateAssetCriticalityConfigSchema,
  documentation: {
    details: i18n.translate(
      'entityStore.workflow.steps.updateAssetCriticality.documentation.details',
      {
        defaultMessage:
          'Sets, updates, or removes the asset criticality level for an Entity Store (v2) ' +
          'entity, identified by its entity type and entity ID (EUID). Pass `criticality_level: ' +
          'null` to remove an existing criticality level. By default, also triggers a risk ' +
          'score recalculation for the entity; set `recalculate-risk-score: false` to skip this.',
      }
    ),
    examples: [
      `## Set criticality for a host
\`\`\`yaml
- name: mark_host_critical
  type: entityStore.updateAssetCriticality
  with:
    entity_type: "host"
    entity_id: "{{ variables.host_entity_id }}"
    criticality_level: "high_impact"
\`\`\``,
      `## Remove criticality for a host
\`\`\`yaml
- name: clear_host_criticality
  type: entityStore.updateAssetCriticality
  with:
    entity_type: "host"
    entity_id: "{{ variables.host_entity_id }}"
    criticality_level: null
\`\`\``,
      `## Set criticality for a user without triggering risk score recalculation
\`\`\`yaml
- name: mark_user_critical
  type: entityStore.updateAssetCriticality
  recalculate-risk-score: false
  with:
    entity_type: "user"
    entity_id: "{{ variables.user_entity_id }}"
    criticality_level: "extreme_impact"
\`\`\``,
    ],
  },
};
