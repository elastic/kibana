/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';
import { alertsFilterQuerySchema } from './v1';
import { rawMaintenanceWindowSchema as rawMaintenanceWindowSchemaV2 } from './v2';

// alerting v2 scope carries its own `enabled`: it is new in MV5, so no released
// model version constrains its shape.
export const alertingV2ScopeSchema = schema.object({
  enabled: schema.boolean(),
  kql: schema.maybe(schema.string({ maxLength: MAX_KQL_LENGTH })),
});

export const rawMaintenanceWindowSchema = rawMaintenanceWindowSchemaV2.extends({
  scope: schema.maybe(
    schema.object({
      // Sibling flag rather than `alerting.enabled`: MV4's forwardCompatibility schema requires
      // `kql` + `filters` inside `alerting` (the shipped definition), and main's
      // filterMaintenanceWindows buckets on `scope.alerting` truthiness. Keeping `alerting` in
      // the MV4 shape makes a rolled-back node behave identically to today.
      //
      // A rolled-back MV4 node strips this key via `unknowns: 'ignore'`, leaving the document
      // byte-identical to what MV4 wrote — there is no breakage in either direction.
      alertingEnabled: schema.maybe(schema.boolean()),
      // MV4 shape: required-or-null. Do NOT add fields here; doing so would break the shipped
      // MV4 forwardCompatibility schema which still requires `kql` + `filters`.
      alerting: schema.nullable(alertsFilterQuerySchema),
      alertingV2: schema.maybe(alertingV2ScopeSchema),
    })
  ),
});
