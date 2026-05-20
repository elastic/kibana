export declare const MAX_STREAM_NAME_LENGTH = 200;
/**
 * Reserved stream names.
 * These are the names that are not allowed to be used as data stream names by Elasticsearch.
 * @see https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream#operation-indices-create-data-stream-path
 */
export declare const RESERVED_STREAM_NAMES: string[];
/**
 * Invalid stream name prefixes.
 * These are the prefixes that Elasticsearch does not allow in data stream names.
 * @see https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream#operation-indices-create-data-stream-path
 */
export declare const INVALID_STREAM_NAME_PREFIXES: string[];
/**
 * Characters that are not allowed in stream names.
 * These are the characters that Elasticsearch does not allow in index template/data stream names.
 * @see https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream#operation-indices-create-data-stream-path
 */
export declare const INVALID_STREAM_NAME_CHARACTERS: string[];
export type StreamNameValidationError = 'empty' | 'tooLong' | 'reservedName' | 'invalidPrefix' | 'uppercase' | 'invalidCharacter';
interface StreamNameValidationMetaByError {
    empty: never;
    tooLong: {
        maxLength: number;
    };
    reservedName: {
        name: string;
    };
    invalidPrefix: {
        prefix: string;
    };
    uppercase: never;
    invalidCharacter: {
        characters: string[];
    };
}
type StreamNameValidationInvalidResult = {
    [E in StreamNameValidationError]: {
        valid: false;
        error: E;
        message: string;
        meta?: StreamNameValidationMetaByError[E];
    };
}[StreamNameValidationError];
export type StreamNameValidationResult = {
    valid: true;
} | StreamNameValidationInvalidResult;
/**
 * Validates a stream name against Elasticsearch naming requirements.
 * Returns an object indicating validity and an error message if invalid.
 */
export declare const validateStreamName: (name: string) => StreamNameValidationResult;
export {};
