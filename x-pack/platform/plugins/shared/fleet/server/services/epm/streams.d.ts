import { PassThrough } from 'stream';
export declare function bufferToStream(buffer: Buffer): PassThrough;
export declare function streamToString(stream: NodeJS.ReadableStream | Buffer): Promise<string>;
export declare function streamToBuffer(stream: NodeJS.ReadableStream, size?: number): Promise<Buffer>;
