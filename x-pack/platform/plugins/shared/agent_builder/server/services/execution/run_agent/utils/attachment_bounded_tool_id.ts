/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';

/** Several inference connectors (e.g. Bedrock) cap tool names at 64 characters after sanitization. */
export const MAX_CONNECTOR_TOOL_NAME_LENGTH = 64;

/**
 * Stay below the connector limit even if `createToolIdMappings` appends a disambiguation suffix (`_1`, …).
 */
const MAX_BASE_SANITIZED_LENGTH = MAX_CONNECTOR_TOOL_NAME_LENGTH - 3;

const ATTACHMENT_ID_PREFIX_HEX_LENGTH = 12;

/**
 * Stable, unique tool id per attachment + bounded tool, short enough for connector tool name limits.
 * Uses a hash of the attachment id instead of embedding the full id (UUIDs exceed limits with long tool ids).
 */
export const attachmentScopedBoundedToolId = (
  attachmentId: string,
  boundedToolId: string
): string => {
  const prefix = createHash('sha256')
    .update(attachmentId)
    .digest('hex')
    .slice(0, ATTACHMENT_ID_PREFIX_HEX_LENGTH);
  const combined = `${prefix}_${boundedToolId}`;
  if (sanitizeToolId(combined).length <= MAX_BASE_SANITIZED_LENGTH) {
    return combined;
  }
  const toolSuffix = createHash('sha256').update(boundedToolId).digest('hex').slice(0, 16);
  return `${prefix}_${toolSuffix}`;
};
