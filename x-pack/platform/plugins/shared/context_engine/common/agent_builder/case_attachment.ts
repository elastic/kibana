/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PatternCase } from '../http_api/patterns';

/**
 * The case attachment carries a single failing case (one retrieval/tool event) into a
 * conversation. It records where the originating trace lives (`traces_index` +
 * `case.round_id`) so the agent can pull the full trace via the attachment's bounded
 * `get_case_trace` tool, and which AI index + pattern it belongs to so it can propose a fix.
 */
export interface CaseAttachmentData {
  case: PatternCase;
  ai_index_id: string;
  /** The trace index the case's round_id can be found in (from the AI index's self-improvement config). */
  traces_index?: string;
  /** Lightweight pattern context, when the case was opened from a detected pattern. */
  pattern?: { pattern_key: string; type: string; sub_type?: string };
}

/** Lightweight runtime guard for the attachment payload. */
export const isCaseAttachmentData = (input: unknown): input is CaseAttachmentData =>
  typeof input === 'object' &&
  input !== null &&
  typeof (input as CaseAttachmentData).ai_index_id === 'string' &&
  typeof (input as CaseAttachmentData).case === 'object' &&
  (input as CaseAttachmentData).case !== null &&
  typeof (input as CaseAttachmentData).case.case_id === 'string';
