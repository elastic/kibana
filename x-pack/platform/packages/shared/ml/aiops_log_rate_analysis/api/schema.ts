/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsLogRateAnalysisSchemaV2 } from './schema_v2';
import type { AiopsLogRateAnalysisSchemaV3 } from './schema_v3';

export type AiopsLogRateAnalysisApiVersion = '2' | '3';

const LATEST_API_VERSION: AiopsLogRateAnalysisApiVersion = '3';

export type AiopsLogRateAnalysisSchema<
  T extends AiopsLogRateAnalysisApiVersion = typeof LATEST_API_VERSION
> = T extends '2'
  ? AiopsLogRateAnalysisSchemaV2
  : T extends '3'
  ? AiopsLogRateAnalysisSchemaV3
  : never;
