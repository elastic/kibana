import type { Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { Result } from './result_type';
export interface BufferOptions {
    bufferMaxDuration?: number;
    bufferMaxOperations?: number;
    logger?: Logger;
}
export interface Entity {
    id: string;
}
export interface ErrorOutput {
    type: string;
    id: string;
    status?: number;
    error: SavedObjectError | estypes.ErrorCause;
}
export type OperationResult<T> = Result<T, ErrorOutput>;
export type Operation<T> = (entity: T) => Promise<Result<T, ErrorOutput>>;
export type BulkOperation<T> = (entities: T[]) => Promise<Array<OperationResult<T>>>;
export declare function createBuffer<T extends Entity>(bulkOperation: BulkOperation<T>, { bufferMaxDuration, bufferMaxOperations, logger }: BufferOptions): Operation<T>;
