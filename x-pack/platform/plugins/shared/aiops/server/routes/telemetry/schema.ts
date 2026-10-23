/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { AIOPS_USAGE_ID } from '@kbn/aiops-common/constants';

export const telemetrySchema = schema.object({
  id: schema.oneOf([
    schema.literal(AIOPS_USAGE_ID.CATEGORIZATION),
    schema.literal(AIOPS_USAGE_ID.LOG_RATE_ANALYSIS),
    schema.literal(AIOPS_USAGE_ID.LOG_RATE_ANALYSIS_FIELD_CANDIDATES),
    schema.literal(AIOPS_USAGE_ID.RENDER_ESQL_CATEGORIZATION_RESULTS),
    schema.literal(AIOPS_USAGE_ID.RENDER_ESQL_CHANGE_POINT_RESULTS),
  ]),
  origin: schema.string({ maxLength: 256 }),
});

export type TelemetrySchema = TypeOf<typeof telemetrySchema>;
