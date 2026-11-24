/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AiIndexAutomationContext,
  AiIndexSignalsSummary,
  AiIndexSourceContext,
  AiIndexTraceContext,
} from '../ai_index_schemas';

export interface SuggestAutomationContextResponse {
  sources: AiIndexSourceContext[];
  automations: AiIndexAutomationContext[];
  traces: AiIndexTraceContext[];
  signals_summary: AiIndexSignalsSummary;
}
