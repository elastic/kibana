import type { ToolResult } from '@kbn/agent-builder-common/tools';
import type { ToolCallWithResult } from '@kbn/agent-builder-common';
import type { FileEntry } from './filestore';
import type { FileEntryAccessor } from './file_entry_accessor';
/**
 * Store to access tool results during execution. Extends `FileEntryAccessor`
 * so callers that need per-result file-level metadata (e.g. `token_count`)
 * can read it without going through the byte-level `IFileSystem`.
 */
export interface ToolResultStore extends FileEntryAccessor {
    has(resultId: string): boolean;
    get(resultId: string): ToolResult;
    getEntryByResultId(toolResultId: string): Promise<FileEntry | undefined>;
}
/**
 * Writable version of ToolResultStore, used internally by the runner/agent.
 */
export interface WritableToolResultStore extends ToolResultStore {
    add(toolCall: ToolCallWithResult): void;
    asReadonly(): ToolResultStore;
}
export interface ToolResultWithMeta {
    tool_call_id: string;
    tool_id: string;
    result: ToolResult;
}
