import type { Streams } from '@kbn/streams-schema';
export declare const createRootStreamDefinition: (streamName?: string) => Streams.WiredStream.Definition;
export declare function hasSupportedStreamsRoot(streamName: string): boolean;
