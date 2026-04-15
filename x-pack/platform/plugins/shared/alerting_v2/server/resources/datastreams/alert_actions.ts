/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDeepStrictEqual } from 'util';
import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod/v4';
import { alertActionTypeDefinitions } from '@kbn/alerting-v2-alert-actions';
import type { AlertActionDefinition } from '@kbn/alerting-v2-alert-actions';
import type { AlertActionTypeRegistry } from '../../lib/alert_action_types';
import type { ResourceDefinition } from './types';

export const ALERT_ACTIONS_DATA_STREAM = '.alert-actions';
export const ALERT_ACTIONS_DATA_STREAM_VERSION = 2;
export const ALERT_ACTIONS_BACKING_INDEX = '.ds-.alert-actions-*';
export const ALERT_ACTIONS_ILM_POLICY_NAME = '.alert-actions-ilm-policy';

export const ALERT_ACTIONS_ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
        },
      },
    },
  },
};

const baseAlertActionSchema = z.object({
  '@timestamp': z.string(),
  group_hash: z.string(),
  last_series_event_timestamp: z.string(),
  actor: z.string().nullable(),
  action_type: z.string(),
  episode_status: z.string().optional(),
  rule_id: z.string(),
  notification_group_id: z.string().optional(),
  source: z.string().optional(),
  space_id: z.string(),
});

export const alertActionSchema = buildAlertActionSchema(
  baseAlertActionSchema,
  alertActionTypeDefinitions
);

export type AlertAction = z.infer<typeof alertActionSchema>;

export const getAlertActionsResourceDefinition = (
  registry: AlertActionTypeRegistry
): ResourceDefinition => ({
  key: `data_stream:${ALERT_ACTIONS_DATA_STREAM}`,
  dataStreamName: ALERT_ACTIONS_DATA_STREAM,
  version: ALERT_ACTIONS_DATA_STREAM_VERSION,
  mappings: registry.getComposedMappings(),
  ilmPolicy: { name: ALERT_ACTIONS_ILM_POLICY_NAME, policy: ALERT_ACTIONS_ILM_POLICY },
});

/**
 * Collects all action-type-specific body fields from the given definitions,
 * makes them optional, and merges them with the base schema. Validates that no
 * action field shadows a base field or redefines a field already claimed by
 * another action with a different schema.
 */
export function buildAlertActionSchema(
  baseSchema: z.ZodObject<z.ZodRawShape>,
  definitions: readonly AlertActionDefinition[]
) {
  const baseFieldNames = new Set(Object.keys(baseSchema.shape));
  const seenBodyFields = new Map<string, { jsonSchema: unknown; owner: string }>();
  const actionSpecificEntries: Array<[string, z.ZodType]> = [];

  for (const def of definitions) {
    for (const [key, originalSchema] of Object.entries(def.bodySchema.shape)) {
      if (baseFieldNames.has(key)) {
        throw new Error(
          `Action '${def.id}' defines body field '${key}' which is a reserved base schema field.`
        );
      }

      const jsonSchema = toComparableJsonSchema(originalSchema as z.ZodType);
      const existing = seenBodyFields.get(key);

      if (existing && !isDeepStrictEqual(existing.jsonSchema, jsonSchema)) {
        throw new Error(
          `Action '${def.id}' defines body field '${key}' as ${JSON.stringify(jsonSchema)}, ` +
            `but action '${existing.owner}' already defines it as ${JSON.stringify(
              existing.jsonSchema
            )}.`
        );
      }

      if (!existing) {
        seenBodyFields.set(key, { jsonSchema, owner: def.id });
        actionSpecificEntries.push([key, (originalSchema as z.ZodType).optional()]);
      }
    }
  }

  return baseSchema.extend(Object.fromEntries(actionSpecificEntries));
}

/**
 * Converts a Zod schema to its JSON Schema representation with metadata
 * fields stripped so that structurally identical schemas with different
 * descriptions are considered equal.
 */
function toComparableJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { description, $schema, ...structural } = z.toJSONSchema(schema) as Record<string, unknown>;
  return structural;
}
