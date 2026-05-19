import type { Stream } from 'stream';
import type { WriteFileContent } from '../types';
type ValidatedContent<T> = T extends Iterable<unknown> ? Buffer : T extends Stream | AsyncIterable<unknown> ? T : T | Buffer;
export declare function validateAndSanitizeFileData<T extends WriteFileContent>(data: T, filePath: string): ValidatedContent<T>;
export {};
