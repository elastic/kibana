import { Streams } from '../models/streams';
export declare function getIndexPatternsForStream<T extends Streams.all.Definition | undefined>(stream: T): T extends Streams.all.Definition ? string[] : undefined;
export declare function getSourcesForStream(stream: Streams.all.Definition): string[];
