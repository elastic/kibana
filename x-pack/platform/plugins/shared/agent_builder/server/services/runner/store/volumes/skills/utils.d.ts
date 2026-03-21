import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillFileEntry, SkillReferencedContentFileEntry } from './types';
/**
 * Get the VFS entry path for a skill.
 */
export declare const getSkillEntryPath: ({ skill, }: {
    skill: Pick<InternalSkillDefinition, "basePath" | "name">;
}) => string;
export declare const getSkillReferencedContentEntryPath: ({ skill, referencedContent, }: {
    skill: Pick<InternalSkillDefinition, "basePath" | "name">;
    referencedContent: {
        relativePath: string;
        name: string;
    };
}) => string;
export declare const getSkillPlainText: ({ skill, }: {
    skill: Pick<InternalSkillDefinition, "name" | "description" | "content">;
}) => string;
/**
 * Creates VFS file entries for a skill that has a basePath.
 */
export declare const createSkillEntries: (skill: InternalSkillDefinition) => (SkillFileEntry | SkillReferencedContentFileEntry)[];
export declare const isSkillFileEntry: (entry: FileEntry) => entry is SkillFileEntry;
