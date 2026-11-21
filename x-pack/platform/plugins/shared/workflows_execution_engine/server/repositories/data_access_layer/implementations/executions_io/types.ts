/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import type { ExecutionIoType } from '@kbn/workflows/server';

/** One input or output value for a step or workflow execution. */
export interface EsExecutionIo {
  id: string;
  executionId: string;
  type: ExecutionIoType;
  /** Byte length. Absent when the value was read from a legacy execution document. */
  size?: number;
  value?: JsonValue | null;
  '@timestamp': string;
}
