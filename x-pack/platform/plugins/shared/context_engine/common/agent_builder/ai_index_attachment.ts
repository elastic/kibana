/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../http_api/ai_indices';

/**
 * The AI index attachment carries a snapshot of the index (its sources,
 * automations, and self-improvement config). Created by reference (origin =
 * the AI index id); the snapshot is resolved from the registry at add time.
 */
export type AiIndexAttachmentData = AiIndexHttpItem;

/** Lightweight runtime guard for the attachment payload. */
export const isAiIndexAttachmentData = (input: unknown): input is AiIndexAttachmentData =>
  typeof input === 'object' &&
  input !== null &&
  typeof (input as AiIndexAttachmentData).id === 'string' &&
  typeof (input as AiIndexAttachmentData).dest === 'object';
