/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StorageSchemaVersioning } from '@kbn/storage-adapter';
import { ensureMetadata } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import {
  ASSET_UUID,
  ASSET_ID,
  ASSET_TYPE,
  STREAM_NAME,
  QUERY_KQL_BODY,
  QUERY_ESQL_QUERY,
  QUERY_TITLE,
  QUERY_SEVERITY_SCORE,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  RULE_BACKED,
  RULE_ID,
} from '../fields';
import { computeRuleId, buildEsqlQueryFromKql } from './helpers/query';
import type { StoredQueryLink } from './query_client';

const v1Schema = z
  .object({
    [ASSET_UUID]: z.string(),
    [ASSET_ID]: z.string(),
    [ASSET_TYPE]: z.string(),
    [STREAM_NAME]: z.string(),
    [QUERY_KQL_BODY]: z.string().optional(),
    [QUERY_ESQL_QUERY]: z.string().optional(),
    [QUERY_TITLE]: z.string().optional(),
    [QUERY_SEVERITY_SCORE]: z.number().optional(),
    [RULE_BACKED]: z.boolean().optional(),
    [RULE_ID]: z.string().optional(),
  })
  .passthrough();

const v2Schema = z
  .object({
    [ASSET_UUID]: z.string(),
    [ASSET_ID]: z.string(),
    [ASSET_TYPE]: z.string(),
    [STREAM_NAME]: z.string(),
    [QUERY_KQL_BODY]: z.string().optional(),
    [QUERY_ESQL_QUERY]: z.string(),
    [QUERY_TITLE]: z.string().optional(),
    [QUERY_SEVERITY_SCORE]: z.number().optional(),
    [RULE_BACKED]: z.boolean(),
    [RULE_ID]: z.string(),
  })
  .passthrough();

function migrateV1ToV2(input: unknown): Record<string, unknown> {
  const migrated = { ...(input as Record<string, unknown>) };

  if (!migrated[QUERY_ESQL_QUERY]) {
    const streamName = migrated[STREAM_NAME] as string;
    const featureFilterJson = migrated[QUERY_FEATURE_FILTER];
    let featureFilter: Condition | undefined;
    if (featureFilterJson && typeof featureFilterJson === 'string' && featureFilterJson !== '') {
      try {
        featureFilter = JSON.parse(featureFilterJson) as Condition;
      } catch {
        featureFilter = undefined;
      }
    }

    const queryInput = {
      kql: { query: migrated[QUERY_KQL_BODY] as string },
      feature:
        migrated[QUERY_FEATURE_NAME] && featureFilter
          ? {
              name: migrated[QUERY_FEATURE_NAME] as string,
              filter: featureFilter,
              type: 'system' as const,
            }
          : undefined,
    };

    migrated[QUERY_ESQL_QUERY] = buildEsqlQueryFromKql([streamName, `${streamName}.*`], queryInput);
  }

  migrated[QUERY_ESQL_QUERY] = ensureMetadata(migrated[QUERY_ESQL_QUERY] as string);

  if (!(RULE_ID in migrated)) {
    migrated[RULE_ID] = computeRuleId(
      migrated[ASSET_UUID] as string,
      migrated[QUERY_KQL_BODY] as string
    );
  }

  if (!(RULE_BACKED in migrated)) {
    migrated[RULE_BACKED] = true;
  }

  return migrated;
}

export const queryVersioning = new StorageSchemaVersioning<StoredQueryLink>([
  { version: 1, schema: v1Schema },
  { version: 2, schema: v2Schema, migrate: migrateV1ToV2 },
]);
