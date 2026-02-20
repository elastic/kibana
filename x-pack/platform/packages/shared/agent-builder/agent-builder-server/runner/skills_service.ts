/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition, SkillBoundedTool } from '../skills';
import type { ExecutableTool } from './tool_provider';

/**
 * Service to access skill type definitions.
 */
export interface SkillsService {
  /**
   * Returns the list of skill type definitions
   */
  list(): SkillDefinition[];
  /**
   * Returns the skill type definition for a given skill id
   */
  getSkillDefinition(skillId: string): SkillDefinition | undefined;
  /**
   * Convert a skill-scoped tool to a generic executable tool
   */
  convertSkillTool(tool: SkillBoundedTool): ExecutableTool;
}
