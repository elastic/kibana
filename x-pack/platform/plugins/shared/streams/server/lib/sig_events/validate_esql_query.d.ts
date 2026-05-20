import type { Streams } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
export declare class EsqlQueryValidationError extends StatusError {
    constructor(message: string, data?: unknown);
}
export declare function validateEsqlQueryForStreamOrThrow({ esqlQuery, stream, }: {
    esqlQuery: string;
    stream: Streams.all.Definition;
}): void;
