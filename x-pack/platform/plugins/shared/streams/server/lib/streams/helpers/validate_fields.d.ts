import type { ElasticsearchClient } from '@kbn/core/server';
import type { FieldDefinition, Streams } from '@kbn/streams-schema';
export declare function validateAncestorFields({ ancestors, fields, streamName, }: {
    ancestors: Streams.WiredStream.Definition[];
    fields: FieldDefinition;
    streamName: string;
}): void;
export declare function validateSystemFields(definition: Streams.WiredStream.Definition): void;
export declare function validateClassicFields(definition: Streams.ClassicStream.Definition): void;
export declare function validateSimulation(definition: Streams.ClassicStream.Definition | Streams.WiredStream.Definition, esClient: ElasticsearchClient): Promise<void>;
export declare function validateDescendantFields({ descendants, fields, }: {
    descendants: Streams.WiredStream.Definition[];
    fields: FieldDefinition;
}): void;
