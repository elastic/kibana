/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common';

export type StreamType = 'send' | 'regenerate' | 'resume';

export interface ActiveStream {
  type: StreamType;
  agentReasoning: string | null;
}

export interface StreamRecord {
  pendingMessage?: string;
  error?: unknown;
  errorSteps: ConversationRoundStep[];
}
