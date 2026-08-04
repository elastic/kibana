import type { FileEntry, FsEntry } from './filestore';
export interface FileEntryAccessor {
    getEntry(path: string): Promise<FileEntry | undefined>;
    listEntries(dirPath: string): Promise<FsEntry[]>;
    entryExists(path: string): Promise<boolean>;
}
