import type { ParsedSkillMeta } from '@kbn/agent-builder-common';
export interface ParsedSkillFileResult {
    meta: ParsedSkillMeta;
    content: string;
}
/**
 * Parses a SKILL.md file content, extracting YAML frontmatter metadata
 * and the markdown body.
 */
export declare const parseSkillFile: (rawContent: string) => ParsedSkillFileResult;
