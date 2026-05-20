import type { ArchiveEntry } from '../../../../common/types';
export declare function untarBuffer(buffer: Buffer, filter?: (entry: ArchiveEntry) => boolean, onEntry?: (entry: ArchiveEntry) => Promise<void>, shouldReadBuffer?: (path: string) => boolean): Promise<void>;
export declare function unzipBuffer(buffer: Buffer, filter?: (entry: ArchiveEntry) => boolean, onEntry?: (entry: ArchiveEntry) => Promise<void>, shouldReadBuffer?: (path: string) => boolean): Promise<unknown>;
type BufferExtractor = typeof unzipBuffer | typeof untarBuffer;
export declare function getBufferExtractor(args: {
    contentType: string;
} | {
    archivePath: string;
}): BufferExtractor | undefined;
export {};
