import type { Writable } from 'stream';
import { Duplex } from 'stream';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ReportingCore } from '..';
type Callback = (error?: Error) => void;
interface ContentStreamDocument {
    id: string;
    index: string;
    if_primary_term?: number;
    if_seq_no?: number;
    created_at?: string;
}
type ContentStreamEncoding = 'base64' | 'raw';
interface ContentStreamParameters {
    /**
     * Content encoding. By default, it is Base64.
     */
    encoding?: ContentStreamEncoding;
}
export declare class ContentStream extends Duplex {
    private client;
    private logger;
    private document;
    private buffers;
    private bytesBuffered;
    private bytesRead;
    private chunksRead;
    private chunksWritten;
    private jobSize?;
    private parameters;
    private primaryTerm?;
    private seqNo?;
    private createdAt?;
    /**
     * The number of bytes written so far.
     * Does not include data that is still queued for writing.
     */
    bytesWritten: number;
    /**
     * The chunking size of reporting files. Larger CSV files will be split into
     * multiple documents, where the stream is chunked into pieces of approximately
     * this size. The actual document size will be slightly larger due to Base64
     * encoding and JSON metadata.
     */
    chunkSize: number;
    constructor(client: ElasticsearchClient, logger: Logger, document: ContentStreamDocument, { encoding }?: ContentStreamParameters);
    private decode;
    private encode;
    private readHead;
    private readChunk;
    private isRead;
    _read(): void;
    private removeChunks;
    private writeHead;
    private writeChunk;
    private flush;
    private flushAllFullChunks;
    _write(chunk: Buffer | string, encoding: BufferEncoding, callback: Callback): void;
    _final(callback: Callback): void;
    getSeqNo(): number | undefined;
    getPrimaryTerm(): number | undefined;
}
export declare function getContentStream(reporting: ReportingCore, document: ContentStreamDocument, parameters?: ContentStreamParameters): Promise<ContentStream>;
export declare function finishedWithNoPendingCallbacks(stream: Writable): Promise<void>;
export {};
