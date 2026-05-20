import { PassThrough } from 'stream';
export declare class PassThroughStream extends PassThrough {
    private onFirstByte;
    bytesWritten: number;
    firstBytePromise: Promise<void>;
    _write(chunk: Buffer | string, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
}
