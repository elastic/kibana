export interface ZipArchive {
    hasEntry(entryPath: string): boolean;
    getEntryPaths(): string[];
    getEntryContent(entryPath: string): Promise<Buffer>;
    close(): void;
}
export declare const openZipArchive: (archivePath: string) => Promise<ZipArchive>;
