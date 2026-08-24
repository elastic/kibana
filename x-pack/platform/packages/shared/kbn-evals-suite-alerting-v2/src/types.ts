/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

/** Attachment types that must each be rendered via a `<render_attachment>` tag. */
export type ExpectRenderAttachment = readonly string[];

export type ExpectAttachmentDataFn = (attachments: VersionedAttachment[]) => void | Promise<void>;

export interface ExpectedToolError {
  /** The tool ID whose results should contain the error. */
  toolId: string;
  /** Substring that must appear in the error result's `data.message`. */
  messageContains: string;
}

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
    /** Asserts that a specific tool returned an error containing the given substring. */
    expectedToolError?: ExpectedToolError;
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
  traceId?: string;
  prompts: PromptRequest[];
}

export interface ToolCallStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

export interface ConversationOutput {
  rounds?: ConversationRound[];
  messages?: Array<{ role?: string; message?: string }>;
  errors?: unknown[];
  traceId?: string;
}
