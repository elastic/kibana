import type { Conversation, ToolResult } from '@kbn/agent-builder-common';
import type { ToolResultStore, WritableToolResultStore, ToolResultWithMeta } from '@kbn/agent-builder-server/runner';
import { MemoryVolume } from '../../filesystem';
export declare const createResultStore: ({ conversation }: {
    conversation?: Conversation;
}) => ToolResultStoreImpl;
export declare class ToolResultStoreImpl implements WritableToolResultStore {
    private readonly results;
    private readonly volume;
    constructor({ toolResults }: {
        toolResults?: ToolResultWithMeta[];
    });
    getVolume(): MemoryVolume;
    add(result: ToolResultWithMeta): void;
    delete(resultId: string): boolean;
    has(resultId: string): boolean;
    get(resultId: string): ToolResult;
    asReadonly(): ToolResultStore;
}
