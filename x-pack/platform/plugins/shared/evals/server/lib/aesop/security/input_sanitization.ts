/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Input Sanitization - Production Security
 *
 * Prevents:
 * - Injection attacks (ES query injection, prompt injection)
 * - Path traversal
 * - XSS in skill markdown
 * - Malicious index patterns
 *
 * From paper Section 8: Threat Model - read-path data exposure and prompt injection risks
 */

/** Maximum allowed length for an index pattern */
const MAX_INDEX_PATTERN_LENGTH = 512;

/**
 * Sanitizes index pattern to prevent injection.
 * Throws on any dangerous pattern — reject rather than silently sanitize.
 */
export function sanitizeIndexPattern(pattern: string): string {
  // Reject excessively long patterns (potential DoS / obfuscation)
  if (pattern.length > MAX_INDEX_PATTERN_LENGTH) {
    throw new Error(
      `Invalid index pattern: exceeds maximum length of ${MAX_INDEX_PATTERN_LENGTH} characters.`
    );
  }

  // Reject immediately if dangerous shell/injection characters are present
  if (/[;&|`$()<>{}!#@%^=+\\'"~]/.test(pattern)) {
    throw new Error(
      `Invalid index pattern: "${pattern}" contains unsafe characters. Only alphanumeric, dots, hyphens, asterisks, and underscores are allowed.`
    );
  }

  // Reject path traversal attempts
  if (/\.\.\//.test(pattern)) {
    throw new Error(`Invalid index pattern: "${pattern}" contains path traversal sequence.`);
  }

  // Validate format (alphanumeric, dots, hyphens, asterisks, underscores only)
  if (!/^[a-zA-Z0-9.*_-]+$/.test(pattern)) {
    throw new Error(
      `Invalid index pattern: "${pattern}". Only alphanumeric, dots, hyphens, asterisks, and underscores allowed.`
    );
  }

  return pattern;
}

/**
 * Sanitizes agent role description to prevent prompt injection
 */
export function sanitizeAgentRole(role: string): string {
  // Remove potential prompt injection attempts
  const sanitized = role
    .replace(/\n{3,}/g, '\n\n') // Excessive newlines
    .replace(/<\/?[^>]+(>|$)/g, '') // HTML tags
    .slice(0, 200); // Max 200 chars

  // Check for prompt injection patterns
  const injectionPatterns = [
    /ignore previous instructions/i,
    /disregard (all|previous|above)/i,
    /new instructions:/i,
    /system:/i,
    /assistant:/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error(
        `Agent role contains potential prompt injection: "${role}". Please use a simple role description like "SOC analyst" or "Security engineer".`
      );
    }
  }

  return sanitized;
}

/**
 * Sanitizes skill markdown before storing (prevent XSS)
 */
export function sanitizeSkillMarkdown(markdown: string): string {
  // Allow markdown but remove dangerous HTML
  const sanitized = markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // <script> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // <iframe> tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Event handlers (onclick, onerror, etc.)
    .replace(/javascript:/gi, ''); // javascript: protocol

  // Validate YAML frontmatter if present
  if (sanitized.startsWith('---')) {
    // Valid frontmatter requires a closing '---' on its own line
    const closingDelimiter = /\n---(\s*\n|$)/;
    if (!closingDelimiter.test(sanitized)) {
      throw new Error('Invalid skill markdown: Missing closing --- for frontmatter');
    }

    // Extract frontmatter content between the two '---' delimiters
    const frontmatterMatch = sanitized.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    if (frontmatter.includes('eval(') || frontmatter.includes('require(')) {
      throw new Error('Invalid skill markdown: Frontmatter contains dangerous code');
    }
  }

  return sanitized;
}

/**
 * Validates scoped indices array
 */
export function validateScopedIndices(indices: unknown): string[] {
  if (!Array.isArray(indices)) {
    throw new Error('scoped_indices must be an array');
  }

  if (indices.length === 0) {
    throw new Error('scoped_indices cannot be empty. Specify at least one index pattern.');
  }

  if (indices.length > 50) {
    throw new Error(
      'scoped_indices cannot exceed 50 patterns. This prevents excessive exploration scope.'
    );
  }

  return indices.map((idx) => {
    if (typeof idx !== 'string') {
      throw new Error(`Invalid index pattern type: ${typeof idx}. Must be string.`);
    }
    return sanitizeIndexPattern(idx);
  });
}

/**
 * Validates exploration depth parameter
 */
export function validateExplorationDepth(depth: unknown): number {
  if (typeof depth !== 'number') {
    throw new Error(`exploration_depth must be a number, got: ${typeof depth}`);
  }

  if (depth < 1 || depth > 1000) {
    throw new Error(`exploration_depth must be between 1 and 1000, got: ${depth}`);
  }

  if (!Number.isInteger(depth)) {
    throw new Error(`exploration_depth must be an integer, got: ${depth}`);
  }

  return depth;
}

/**
 * Validates min pattern frequency parameter
 */
export function validateMinPatternFrequency(freq: unknown): number {
  if (typeof freq !== 'number') {
    throw new Error(`min_pattern_frequency must be a number, got: ${typeof freq}`);
  }

  if (freq < 1 || freq > 1000) {
    throw new Error(`min_pattern_frequency must be between 1 and 1000, got: ${freq}`);
  }

  if (!Number.isInteger(freq)) {
    throw new Error(`min_pattern_frequency must be an integer, got: ${freq}`);
  }

  return freq;
}

/**
 * Redacts PII from data before sending to LLM
 * From paper Section 8: context-window sanitization mitigation
 */
export function redactPII(data: string): string {
  return data
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]') // SSN
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL-REDACTED]') // Email
    .replace(/\b\d{16}\b/g, '[CREDIT-CARD-REDACTED]') // Credit card
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP-REDACTED]'); // IP addresses (optional - may want IPs for security)
}

/**
 * Validates workflow execution timeout
 */
export function validateTimeout(timeoutSec: unknown): number {
  if (typeof timeoutSec !== 'number') {
    throw new Error(`timeout must be a number, got: ${typeof timeoutSec}`);
  }

  if (timeoutSec < 60 || timeoutSec > 7200) {
    throw new Error(`timeout must be between 60s (1 min) and 7200s (2 hours), got: ${timeoutSec}s`);
  }

  return timeoutSec;
}
