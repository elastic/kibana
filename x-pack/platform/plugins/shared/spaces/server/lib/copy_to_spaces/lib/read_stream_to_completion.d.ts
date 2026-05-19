import type { Readable } from 'stream';
export declare const readStreamToCompletion: <T = any>(stream: Readable) => Promise<T[]>;
