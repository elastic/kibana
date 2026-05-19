import type { MaybePromise } from '@kbn/utility-types';
import { z } from '@kbn/zod/v4';
import type { SkillBoundedTool } from './tools';
import type { Directory, FileDirectory, FilePathsFromStructure, StringWithoutSlash, StringWithoutSpace } from './type_utils';
/**
 * Skill directory structure - explicit about how skills are organized.
 *
 * The purpose of this is to encourage skills to be well organized, grouped logically and consistently.
 * This also requires code owners to review directory changes to ensure skills are discoverable.
 *
 * In order to store skills in a new directory, you need to add the directory to the structure.
 */
export type SkillsDirectoryStructure = Directory<{
    skills: Directory<{
        platform: FileDirectory<{
            alerting: FileDirectory;
            dashboard: FileDirectory;
            discover: FileDirectory;
            streams: FileDirectory;
            visualization: FileDirectory;
            workflows: FileDirectory;
        }>;
        observability: FileDirectory<{}>;
        security: FileDirectory<{
            alerts: FileDirectory<{
                rules: FileDirectory;
            }>;
            compliance: FileDirectory<{}>;
            rules: FileDirectory;
            entities: FileDirectory<{}>;
            endpoint: FileDirectory<{}>;
            ml: FileDirectory<{}>;
        }>;
        search: FileDirectory<{}>;
    }>;
}>;
/**
 * Base paths where files can be placed (exact paths from the structure)
 */
type DirectoryPath = FilePathsFromStructure<SkillsDirectoryStructure>;
/**
 * Server-side definition of a skill type.
 */
export interface SkillDefinition<TName extends string = string, TBasePath extends DirectoryPath = DirectoryPath> {
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
     * Base path of the skill. Must start with "skills/".
     *
     * Skills should be grouped logically by path to be discoverable by the agent.
     *
     * If a directory path is not available, you can modify the `SkillsDirectoryStructure` in the agent-builder-server package.
     *
     * Example:
     * - "skills/security/alerts/rules" - skill is stored at the path "security/alerts/rules/[name]/SKILL.md"
     * - "skills/observability/alerts" - skill is stored at the path "observability/alerts/[name]/SKILL.md"
     * - "skills/platform/core" - skill is stored at the path "platform/core/[name]/SKILL.md"
     */
    basePath: TBasePath;
    /**
     * Description of the skill.
     * Max 1024 characters. Non-empty. Describes what the skill does and when to use it.
     */
    description: string;
    /**
     * When true, this skill is only available when experimental features are enabled.
     * Defaults to false.
     */
    experimental?: boolean;
    /**
     * Content of the skill.
     */
    content: string;
    /**
     * Referenced content
     */
    referencedContent?: ReferencedContent[];
    /**
     * Returns the list of tool IDs from the registry which should be exposed to the agent
     * when this skill is used in the conversation.
     *
     * Accepts both statically-known builtin tool IDs and arbitrary tool IDs
     * created at runtime (e.g. tools registered when a data source instance is connected).
     *
     * E.g. the "case_triage" skill type exposes the "platform.core.cases" tool that way.
     */
    getRegistryTools?: () => MaybePromise<string[]>;
    /**
     * Can be used to expose tools which are specific to the skill.
     */
    getInlineTools?: () => MaybePromise<SkillBoundedTool[]>;
}
export interface ReferencedContent {
    /**
     * Name of the content. Also used as the file name `<reference-name>.md`.
     * Must contain only lowercase letters, numbers, and hyphens. Max 64 characters.
     * [basePath]/[name]/[relativePath]/[reference-name] must be unique.
     */
    name: string;
    /**
     * Relative path of the referenced content (relative to the skill base path). Must start with a dot `.`
     *
     * Valid relative paths are:
     * - "." - stores reference content in the same directory as the skill
     * - "./[directory]" - stores reference content in the "[directory]" directory
     * - Avoid multiple levels of directories (such as "./[directory]/[subdirectory]") to keep the structure flat.
     *
     * Examples:
     * - basePath: "skills/security/alerts/rules" & relativePath: "." - stores reference content in the "skills/security/alerts/rules/[name].md" file
     * - basePath: "skills/security/alerts/rules" & relativePath: "./queries" - stores reference content in the "skills/security/alerts/rules/queries/[name].md" file
     */
    relativePath: string;
    /**
     * Content of the reference.
     */
    content: string;
}
export declare const referencedContentSchema: z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    relativePath: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>>;
/**
 * Zod schema for validating SkillTypeDefinition name and description fields.
 * Validates:
 * - name: max 64 characters, lowercase letters, numbers, and hyphens only
 * - description: max 1024 characters, non-empty
 */
export declare const skillDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    basePath: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    content: z.ZodString;
    referencedContent: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        relativePath: z.ZodString;
        content: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
/**
 * Validates a SkillTypeDefinition against the schema constraints.
 * Throws a ZodError if validation fails.
 *
 * @param definition - The SkillTypeDefinition to validate
 * @returns The validated definition
 * @throws {z.ZodError} If validation fails
 */
export declare function validateSkillDefinition<TName extends string, TPath extends DirectoryPath>(definition: SkillDefinition<TName, TPath>): Promise<SkillDefinition<TName, TPath>>;
/**
 * Helper function to create a SkillTypeDefinition with inferred types.
 * This allows you to avoid manually specifying type parameters while still
 * getting full type validation.
 */
export declare function defineSkillType<TName extends string, TPath extends DirectoryPath>(definition: SkillDefinition<TName, TPath>): SkillDefinition<TName, TPath>;
export {};
