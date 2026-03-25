/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isString } from 'lodash';
import { z } from '@kbn/zod/v4';
import { defineVersioning } from '@kbn/storage-adapter';
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
  QUERY_DESCRIPTION,
} from '../fields';
import { computeRuleId, buildEsqlQueryFromKql } from './helpers/query';

const v1Schema = z.looseObject({
  [ASSET_UUID]: z.string(),
  [ASSET_ID]: z.string(),
  [ASSET_TYPE]: z.literal('query'),
  [STREAM_NAME]: z.string(),
  [QUERY_KQL_BODY]: z.string().optional(),
  [QUERY_TITLE]: z.string(),
  [QUERY_SEVERITY_SCORE]: z.number().optional(),
  [QUERY_FEATURE_FILTER]: z.string().optional(),
  [QUERY_FEATURE_NAME]: z.string().optional(),
});

const v2Schema = z.looseObject({
  [ASSET_UUID]: z.string(),
  [ASSET_ID]: z.string(),
  [ASSET_TYPE]: z.literal('query'),
  [STREAM_NAME]: z.string(),
  [QUERY_KQL_BODY]: z.string().optional(),
  [QUERY_ESQL_QUERY]: z.string(),
  [QUERY_TITLE]: z.string(),
  [QUERY_SEVERITY_SCORE]: z.number().optional(),
  [QUERY_DESCRIPTION]: z.string(),
  [RULE_BACKED]: z.boolean(),
  [RULE_ID]: z.string(),
});

export const queryVersioning = defineVersioning(v1Schema)
  .addVersion({
    schema: v2Schema,
    migrate: (input) => {
      const existing = input as Record<string, unknown>;
      let esqlQuery = isString(existing[QUERY_ESQL_QUERY]) ? existing[QUERY_ESQL_QUERY] : undefined;

      if (!esqlQuery) {
        const streamName = input[STREAM_NAME];
        let featureFilter: Condition | undefined;

        if (input[QUERY_FEATURE_FILTER]) {
          try {
            featureFilter = JSON.parse(input[QUERY_FEATURE_FILTER]) as Condition;
          } catch {
            featureFilter = undefined;
          }
        }

        esqlQuery = buildEsqlQueryFromKql([streamName, `${streamName}.*`], {
          kql: { query: input[QUERY_KQL_BODY] ?? '' },
          feature:
            input[QUERY_FEATURE_NAME] && featureFilter
              ? { name: input[QUERY_FEATURE_NAME], filter: featureFilter, type: 'system' as const }
              : undefined,
        });
      }

      return {
        ...input,
        [QUERY_ESQL_QUERY]: ensureMetadata(esqlQuery),
        [RULE_ID]: isString(existing[RULE_ID])
          ? existing[RULE_ID]
          : computeRuleId(input[ASSET_UUID], input[QUERY_KQL_BODY] ?? ''),
        [RULE_BACKED]: isBoolean(existing[RULE_BACKED]) ? existing[RULE_BACKED] : true,
        [QUERY_DESCRIPTION]: isString(existing[QUERY_DESCRIPTION])
          ? existing[QUERY_DESCRIPTION]
          : '',
      };
    },
  })
  .build();
