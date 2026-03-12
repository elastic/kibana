/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition, SkillBoundedTool } from '../skills';
import type { ExecutableTool } from './tool_provider';

/**
 * Service to access skill definitions during runner execution.
 */
export interface SkillsService {
  /**
   * Returns the list of all skill definitions (builtin + persisted).
   */
  list(): Promise<InternalSkillDefinition[]>;
  /**
   * Returns the skill definition for a given skill id, or undefined.
   */
  get(skillId: string): Promise<InternalSkillDefinition | undefined>;
  /**
   * Convert a skill-scoped tool to a generic executable tool.
   */
  convertSkillTool(tool: SkillBoundedTool): ExecutableTool;
}
