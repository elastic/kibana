import { Streams } from '../models/streams';
export type StreamType = 'wired' | 'classic' | 'query' | 'unknown';
export declare function getStreamTypeFromDefinition(definition: Streams.all.Definition): StreamType;
