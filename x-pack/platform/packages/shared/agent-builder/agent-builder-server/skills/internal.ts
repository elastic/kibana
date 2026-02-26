/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { SkillBoundedTool } from './tools';
import type { ReferencedContent } from './type_definition';

/**
 * Internal generic representation for a skill definition.
 *
 * This is the unified type used by both builtin and persisted skill providers,
 * and is the type returned by the skill registry. It mirrors the role of
 * `InternalToolDefinition` in the tool system.
 *
 * Conversion to `PublicSkillDefinition` (for API responses) happens at the
 * route handler boundary.
 */
export interface InternalSkillDefinition {
  /**
   * Stable unique identifier for the skill.
   */
  id: string;
  /**
   * Name of the skill.
   */
  name: string;
  /**
   * Description of the skill.
   */
  description: string;
  /**
   * Content of the skill.
   */
  content: string;
  /**
   * Whether this skill is read-only (builtin) or writable (persisted).
   */
  readonly: boolean;
  /**
   * Referenced content for the skill.
   */
  referencedContent?: ReferencedContent[];
  /**
   * Base path for filesystem mounting. Only defined for builtin skills.
   */
  basePath?: string;
  /**
   * Returns tool IDs from the tool registry that this skill can use.
   * - Builtin skills: returns from the skill definition's getRegistryTools()
   * - Persisted skills: returns tool_ids from persistence
   */
  getRegistryTools: () => MaybePromise<string[]>;
  /**
   * Returns inline tool definitions specific to this skill.
   * Only available for builtin skills.
   */
  getInlineTools?: () => MaybePromise<SkillBoundedTool[]>;
}
