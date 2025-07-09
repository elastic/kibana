/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDescriptor } from '@kbn/onechat-common';

export interface CallAgentResponse<TResult = unknown> {
  runId: string;
  result: TResult;
}

export interface ListAgentsResponse {
  agents: AgentDescriptor[];
}
