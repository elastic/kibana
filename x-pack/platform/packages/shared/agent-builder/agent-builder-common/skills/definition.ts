/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Referenced content for a skill.
 */
export interface SkillReferencedContent {
  name: string;
  relativePath: string;
  content: string;
}

/**
 * Public-facing skill definition exposed via API responses.
 * Includes a `readonly` field to distinguish built-in from user-created skills.
 */
export interface PublicSkillDefinition {
  /**
   * Unique identifier for the skill.
   */
  id: string;
  /**
   * Name of the skill.
   */
  name: string;
  /**
   * Description of what the skill does.
   */
  description: string;
  /**
   * Skill instructions content (markdown).
   */
  content: string;
  /**
   * Optional referenced content.
   */
  referenced_content?: SkillReferencedContent[];
  /**
   * Tool IDs from the tool registry that this skill references.
   * Only present for user-created skills.
   */
  tool_ids?: string[];
  /**
   * Whether this skill is built-in (readonly) or user-created.
   */
  readonly: boolean;
}

/**
 * Shape for creating a persisted (user-created) skill.
 */
export interface PersistedSkillCreateRequest {
  /**
   * Unique identifier for the skill.
   */
  id: string;
  /**
   * Name of the skill.
   */
  name: string;
  /**
   * Description of what the skill does.
   */
  description: string;
  /**
   * Skill instructions content (markdown).
   */
  content: string;
  /**
   * Optional referenced content.
   */
  referenced_content?: SkillReferencedContent[];
  /**
   * Tool IDs from the tool registry.
   */
  tool_ids: string[];
}

/**
 * Shape for updating a persisted (user-created) skill.
 */
export interface PersistedSkillUpdateRequest {
  /**
   * Updated name.
   */
  name?: string;
  /**
   * Updated description.
   */
  description?: string;
  /**
   * Updated skill instructions content.
   */
  content?: string;
  /**
   * Updated referenced content.
   */
  referenced_content?: SkillReferencedContent[];
  /**
   * Updated tool IDs.
   */
  tool_ids?: string[];
}
