/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deep Agent Utilities
 *
 * This module exports utility functions and types for the deep agent,
 * organized into three main areas:
 *
 * - **Skill Discovery** (`skill_discovery.ts`): Functions for discovering,
 *   filtering, and generating prompts for skills. Includes context management
 *   for tracking skill invocations across conversation turns.
 *
 * - **Payload Truncation** (`payload_truncation.ts`): Utilities for keeping
 *   payloads compact to avoid context overflow. Supports deep truncation of
 *   objects, schema truncation, and error payload generation.
 *
 * - **Retry with Backoff** (`retry_with_backoff.ts`): Exponential backoff
 *   retry logic for handling transient failures in API calls.
 *
 * @module utils
 */

export { formatSkillsDirectoryTree } from './skills_directory_tree';
export {
  type DiscoveredSkill,
  type DiscoveredTool,
  type SkillContext,
  type SkillInvocation,
  createSkillContext,
  serializeSkillContext,
  deserializeSkillContext,
  recordSkillInvocation,
  discoverSkills,
  extractToolsFromSkill,
  generateSkillPrompt,
  generateSkillSummary,
  getToolSchema,
  findSkillForTool,
  groupSkillsByDomain,
} from './skill_discovery';
export {
  DEFAULT_MAX_CHARS,
  toCompactJson,
  truncateString,
  deepTruncate,
  truncateSchema,
  generateMinimalExample,
  createTruncatedErrorPayload,
  truncateToolResult,
} from './payload_truncation';
export {
  type RetryWithBackoffOptions,
  retryWithBackoff,
  createRetryWrapper,
  isTransientError,
} from './retry_with_backoff';
