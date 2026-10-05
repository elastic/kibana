/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  MAX_TRACE_STEPS,
  SET_TRACE_TOOL_ID,
  TRACE_ATTACHMENT_TYPE,
  TRACE_INDEX_NAME,
  TRACE_STEP_TYPES,
} from './constants';

export {
  investigationTraceSchema,
  traceStepSchema,
  traceStepsSchema,
  traceStepTypeSchema,
} from './trace';

export type { InvestigationTrace, TraceStep, TraceStepType } from './trace';
