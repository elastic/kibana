/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';
import { MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';

/**
 * Domain/API schema for the deprecated `scopedQuery` field. This is the shipped contract —
 * do NOT change it; changing it here would alter the public API of an existing field.
 */
export const alertsFilterQuerySchema = schema.object({
  kql: schema.string(),
  filters: schema.arrayOf(
    schema.object({
      query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
      meta: schema.recordOf(schema.string(), schema.any()),
      $state: schema.maybe(
        schema.object({
          store: schema.oneOf([
            schema.literal(FilterStateStore.APP_STATE),
            schema.literal(FilterStateStore.GLOBAL_STATE),
          ]),
        })
      ),
    })
  ),
  dsl: schema.maybe(schema.string()),
});

/**
 * Domain schema for the new alerting v1 scope (`scope.alerting`). Carries `enabled` at this
 * layer — the storage layer uses the sibling `alertingEnabled` flag instead to stay compatible
 * with the shipped MV4 `alerting` shape.
 */
export const alertingScopeSchema = schema.object({
  enabled: schema.boolean(),
  kql: schema.maybe(schema.string()),
  filters: schema.maybe(
    schema.arrayOf(
      schema.object({
        query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        meta: schema.recordOf(schema.string(), schema.any()),
        $state: schema.maybe(
          schema.object({
            store: schema.oneOf([
              schema.literal(FilterStateStore.APP_STATE),
              schema.literal(FilterStateStore.GLOBAL_STATE),
            ]),
          })
        ),
      })
    )
  ),
  dsl: schema.maybe(schema.string()),
});

export const alertingV2ScopeSchema = schema.object({
  enabled: schema.boolean(),
  kql: schema.maybe(schema.string({ maxLength: MAX_KQL_LENGTH })),
});
