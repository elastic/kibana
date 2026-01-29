import type { SkillTypeDefinition, SkillBoundedTool } from '../skills';
import type { ExecutableTool } from './tool_provider';

/**
 * Service to access skill type definitions.
 */
export interface SkillsService {
  /**
   * Returns the list of skill type definitions
   */
  list(): SkillTypeDefinition[];
  /**
   * Returns the skill type definition for a given skill id
   */
  getSkillDefinition(skillId: string): SkillTypeDefinition | undefined;
  /**
   * Convert a skill-scoped tool to a generic executable tool
   */
  convertSkillTool(tool: SkillBoundedTool): ExecutableTool;
}