/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexTraceType } from '../../../../common/http_api/ai_indices';

/** Trace types this editor can represent. `esql` traces are writable through the API only. */
export type EditableTraceType = Exclude<AiIndexTraceType, 'esql'>;

export interface EditableAiIndexTrace {
  type: EditableTraceType;
  value: string;
}
