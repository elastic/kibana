import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
export declare const getFileSystemInstructions: ({ filesystem, }: {
    filesystem: IFileStore;
}) => Promise<string>;
