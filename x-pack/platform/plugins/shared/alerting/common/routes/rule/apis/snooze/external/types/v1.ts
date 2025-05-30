/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import type { snoozeParamsSchemaV1, snoozeBodySchemaV1, snoozeResponseSchemaV1 } from '../..';

export type SnoozeParams = TypeOf<typeof snoozeParamsSchemaV1>;
export type SnoozeBody = TypeOf<typeof snoozeBodySchemaV1>;
export type SnoozeResponse = TypeOf<typeof snoozeResponseSchemaV1>;
