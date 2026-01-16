/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import { z } from '@kbn/zod';
import type { SkillBoundedTool } from './tools';
import type {
  Directory,
  FileDirectory,
  FilePathsFromStructure,
  StringWithoutSlash,
  StringWithoutSpace,
} from './type_utils';
import type { AgentBuilderBuiltinTool } from '../allow_lists';



/**
 * Skill directory structure - explicit about how skills are organized.
 *
 * The purpose of this is to encorage skills to be well organized and grouped logically.
 *
 * In order to store skills in a new directory, you need to add the directory to the structure.
 */
export type DirectoryStructure = Directory<{
  skills: Directory<{
    platform: FileDirectory;
    observability: FileDirectory<{}>;
    security: FileDirectory<{
      alerts: FileDirectory<{
        rules: FileDirectory;
      }>;
      entities: FileDirectory;
    }>;
    search: FileDirectory<{}>;
  }>;
}>;

/**
 * Base paths where files can be placed (exact paths from the structure)
 */
type DirectoryPath = FilePathsFromStructure<DirectoryStructure>;

/**
 * Server-side definition of a skill type.
 */
export interface SkillTypeDefinition<
  TName extends string = string,
  TPath extends DirectoryPath = DirectoryPath
> {
  /**
   * Stable unique identifier for the skill.
   */
  id: string;
  /**
   * Name for the skill.
   * Max 64 characters. Lowercase letters, numbers, and hyphens only.
   * Path formed by `${path}/${name}` must be unique.
   */
  name: StringWithoutSpace<StringWithoutSlash<TName>>;
  /**
   * Path to the skill. Must start with "skills/".
   *
   * Skills should be grouped logically by path to be discoverable by the agent.
   *
   * If a directory path is not available, you can modify the DirectoryStructure in the agent-builder-server package.
   *
   * Example:
   * - "skills/security/alerts/rules" - skill is stored in the "security/alerts/rules" directory
   * - "skills/observability/alerts" - skill is stored in the "observability/alerts" directory
   * - "skills/platform/core" - skill is stored in the "platform/core" directory
   */
  path: TPath;

  /**
   * Description of the skill.
   * Max 1024 characters. Non-empty. Describes what the skill does and when to use it.
   */
  description: string;
  /**
   * Body of the skill.
   */
  body: string;
  /**
   * should return the list of tools from the registry which should be exposed to the agent
   * when this skill is used in the conversation.
   *
   * Should be used to expose generic tools related to the skill.
   *
   * E.g. the "case_triage" skill type exposes the "platform.core.cases" tool that way.
   */
  getAllowedTools?: () => AgentBuilderBuiltinTool[];

  /**
   * Can be used to expose tools which are specific to the skill.
   */
  getInlineTools?: () => MaybePromise<SkillBoundedTool[]>;
}

/**
 * Zod schema for validating SkillTypeDefinition name and description fields.
 * Validates:
 * - name: max 64 characters, lowercase letters, numbers, and hyphens only
 * - description: max 1024 characters, non-empty
 */
export const skillTypeDefinitionSchema = z.object({
  name: z
    .string()
    .max(64, 'Name must be at most 64 characters')
    .regex(/^[a-z0-9-]+$/, 'Name must contain only lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .min(1, 'Description must be non-empty')
    .max(1024, 'Description must be at most 1024 characters'),
});

/**
 * Validates a SkillTypeDefinition against the schema constraints.
 * Throws a ZodError if validation fails.
 *
 * @param definition - The SkillTypeDefinition to validate
 * @returns The validated definition
 * @throws {z.ZodError} If validation fails
 */
export function validateSkillTypeDefinition<TName extends string, TPath extends DirectoryPath>(
  definition: SkillTypeDefinition<TName, TPath>
): SkillTypeDefinition<TName, TPath> {
  skillTypeDefinitionSchema.parse({
    name: definition.name,
    description: definition.description,
  });
  return definition;
}

/**
 * Helper function to create a SkillTypeDefinition with inferred types.
 * This allows you to avoid manually specifying type parameters while still
 * getting full type validation.
 */
export function defineSkillType<TName extends string, TPath extends DirectoryPath>(
  definition: SkillTypeDefinition<TName, TPath>
): SkillTypeDefinition<TName, TPath> {
  return definition;
}
