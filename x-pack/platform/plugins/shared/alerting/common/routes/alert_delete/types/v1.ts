/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  alertDeleteLastRunResponseSchemaV1,
  alertDeletePreviewQuerySchemaV1,
  alertDeletePreviewResponseSchemaV1,
  alertDeleteScheduleQuerySchemaV1,
} from '..';

export type AlertDeletePreviewQuery = TypeOf<typeof alertDeletePreviewQuerySchemaV1>;
export type AlertDeletePreviewResponse = TypeOf<typeof alertDeletePreviewResponseSchemaV1>;

export type AlertDeleteScheduleQuery = TypeOf<typeof alertDeleteScheduleQuerySchemaV1>;

export type AlertDeleteLastRunResponse = TypeOf<typeof alertDeleteLastRunResponseSchemaV1>;
