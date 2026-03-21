import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';
export interface ToolCallEntryMeta {
    tool_result_type: string;
    tool_id: string;
    tool_call_id: string;
}
export type ToolCallFileEntry<TData extends object = object> = FileEntry<TData, ToolCallEntryMeta>;
