/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOnechatError, OnechatErrorCode } from '@kbn/onechat-common';

/**
 * Normalize error type/code from error object
 * @param error - Error object
 */
export function normalizeErrorType(error: unknown): string {
  if (isOnechatError(error)) {
    return error.code || OnechatErrorCode.internalError;
  }

  return 'other';
}

/**
 * Sanitize text for use in counter names
 * Counter names must be valid identifiers and cannot contain special characters
 * @param text - Text to sanitize
 * @returns Sanitized text safe for counter names
 */
export function sanitizeForCounterName(text: string): string {
  let sanitized = text.replace(/[^a-zA-Z0-9_-]/g, '_');
  sanitized = sanitized.replace(/_+/g, '_');
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  const maxLength = 100;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  if (!sanitized) {
    sanitized = 'unknown';
  }

  return sanitized.toLowerCase();
}
