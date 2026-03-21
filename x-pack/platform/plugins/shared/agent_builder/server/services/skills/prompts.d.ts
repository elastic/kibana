import type { IFileStore } from '@kbn/agent-builder-server/runner';
export declare const getSkillsInstructions: ({ filesystem, }: {
    filesystem: IFileStore;
}) => Promise<string>;
