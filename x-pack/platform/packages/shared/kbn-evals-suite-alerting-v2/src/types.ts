/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type {
  ExpectAttachmentDataFn,
  ExpectRenderAttachment,
} from './evaluators/expected_attachment';

export interface RuleManagementExample extends Example {
  input: {
    turns: string[];
  };
  output: {
    /** Free-form qualitative criteria scored by the LLM Criteria judge. */
    criteria?: string[];
    /** Deterministic tool, attachment, or skill expectations. */
    expectedToolIds?: readonly string[];
    expectedAnyOfToolIds?: readonly string[];
    expectRenderAttachment?: ExpectRenderAttachment;
    expectAttachmentData?: ExpectAttachmentDataFn;
    expectedSkills?: readonly string[];
    notExpectedSkills?: readonly string[];
  };
}

export type EvaluateDataset = (params: {
  dataset: {
    name: string;
    description: string;
    examples: RuleManagementExample[];
  };
}) => Promise<void>;

export interface ConversationTurnResult {
  conversationId?: string;
  steps: unknown[];
  errors: unknown[];
  traceId?: string;
  prompts: PromptRequest[];
}
