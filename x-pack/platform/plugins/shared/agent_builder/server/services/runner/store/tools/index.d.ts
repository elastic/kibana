import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
export declare const getStoreTools: ({ filestore, }: {
    filestore: IFileStore;
}) => BuiltinToolDefinition<any>[];
