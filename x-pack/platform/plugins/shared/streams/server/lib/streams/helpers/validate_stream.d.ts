import { Streams } from '@kbn/streams-schema';
export declare function validateRootStreamChanges(currentStreamDefinition: Streams.WiredStream.Definition, nextStreamDefinition: Streams.WiredStream.Definition): void;
/**
 * Validates field definitions and routing rules for bracket characters in field names.
 * Processing step validation is handled by validateStreamlang.
 */
export declare function validateBracketsInFieldNames(definition: Streams.ingest.all.Definition): void;
