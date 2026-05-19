import type { Stream } from 'stream';
export type WriteFileContent = string | NodeJS.ArrayBufferView | Iterable<string | NodeJS.ArrayBufferView> | AsyncIterable<string | NodeJS.ArrayBufferView> | Stream;
export interface WriteFileOptions {
    override?: boolean;
    volume?: string;
}
export interface FileMetadata {
    alias: string;
    path: string;
}
