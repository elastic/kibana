import type { Streams } from '@kbn/streams-schema';
export declare const ROOT_STREAM_ID = "__ROOT__";
export interface ContentPackStream {
    type: 'stream';
    name: string;
    request: Streams.WiredStream.UpsertRequest;
}
