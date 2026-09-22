/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition, SkillBoundedTool } from '../skills';
import type { ExecutableTool } from './tool_provider';

export interface SkillRegistryListOptions {
  /** When true, excludes `content` and `referenced_content`. */
  summaryOnly?: boolean;
  /** When set, restricts the listing to a single provider type. */
  type?: 'built-in' | 'persisted';
  /** When false (default), skills that belong to a plugin are excluded from results. */
  includePlugins?: boolean;
}

/**
 * Service to access skill definitions during runner execution.
 */
export interface SkillsService {
  /**
   * Returns skill definitions, optionally filtered by provider type.
   */
  list(options?: SkillRegistryListOptions): Promise<InternalSkillDefinition[]>;
  /**
   * Returns the skill definition for a given skill id, or undefined.
   */
  get(skillId: string): Promise<InternalSkillDefinition | undefined>;
  /**
   * Fetches multiple skills by ID. Silently omits IDs that are not found.
   */
  bulkGet(ids: string[]): Promise<Map<string, InternalSkillDefinition>>;
  /**
   * Convert a skill-scoped tool to a generic executable tool.
   */
  convertSkillTool(tool: SkillBoundedTool): ExecutableTool;
}
