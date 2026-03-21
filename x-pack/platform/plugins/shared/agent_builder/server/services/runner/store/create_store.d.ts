import type { Conversation } from '@kbn/agent-builder-common';
import { VirtualFileSystem } from './filesystem';
import { FileSystemStore } from './store';
export declare const createStore: ({ conversation }: {
    conversation?: Conversation;
}) => {
    filesystem: VirtualFileSystem;
    filestore: FileSystemStore;
    resultStore: import("./volumes/tool_results/tool_result_store").ToolResultStoreImpl;
    skillsStore: import("./volumes/skills/skills_store").SkillsStoreImpl;
};
