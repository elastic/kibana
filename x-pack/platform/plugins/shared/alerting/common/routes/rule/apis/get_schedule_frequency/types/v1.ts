/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { getScheduleFrequencyResponseSchemaV1, getScheduleFrequencyResponseBodySchemaV1 } from '..';

export type GetScheduleFrequencyResponseBody = TypeOf<
  typeof getScheduleFrequencyResponseBodySchemaV1
>;

export type GetScheduleFrequencyResponse = TypeOf<typeof getScheduleFrequencyResponseSchemaV1>;
