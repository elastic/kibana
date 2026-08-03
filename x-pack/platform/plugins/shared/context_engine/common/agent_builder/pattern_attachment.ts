/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pattern } from '../http_api/patterns';

/**
 * The pattern attachment carries a detected failure pattern (plus a few
 * representative trace ids) into the management-agent conversation, so the
 * agent can verify it and propose an improvement.
 */
export interface PatternAttachmentData {
  pattern: Pattern;
  representative_trace_ids: string[];
}

export const isPatternAttachmentData = (input: unknown): input is PatternAttachmentData =>
  typeof input === 'object' &&
  input !== null &&
  typeof (input as PatternAttachmentData).pattern === 'object' &&
  (input as PatternAttachmentData).pattern !== null &&
  typeof (input as PatternAttachmentData).pattern.pattern_key === 'string';
