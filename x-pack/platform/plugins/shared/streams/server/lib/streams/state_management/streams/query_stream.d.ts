import { Streams } from '@kbn/streams-schema';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StreamChangeStatus, StreamChanges, ValidationResult } from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';
interface QueryStreamChanges extends StreamChanges {
    query_streams: boolean;
}
/**
 * Extracts the source names (FROM clause targets) from an ES|QL query.
 * @param esql - The ES|QL query string to parse
 * @returns Array of source names referenced in the FROM clause
 */
export declare function getSourcesFromEsqlQuery(esql: string): string[];
export declare class QueryStream extends StreamActiveRecord<Streams.QueryStream.Definition> {
    protected _changes: QueryStreamChanges;
    constructor(definition: Streams.QueryStream.Definition, dependencies: StateDependencies);
    protected doClone(): StreamActiveRecord<Streams.QueryStream.Definition>;
    protected doHandleUpsertChange(definition: Streams.all.Definition, desiredState: State, startingState: State): Promise<{
        cascadingChanges: StreamChange[];
        changeStatus: StreamChangeStatus;
    }>;
    protected doHandleDeleteChange(target: string, desiredState: State, startingState: State): Promise<{
        cascadingChanges: StreamChange[];
        changeStatus: StreamChangeStatus;
    }>;
    protected doValidateUpsertion(desiredState: State, startingState: State): Promise<ValidationResult>;
    protected doValidateDeletion(desiredState: State, startingState: State): Promise<ValidationResult>;
    protected doDetermineCreateActions(): Promise<ElasticsearchAction[]>;
    protected doDetermineUpdateActions(desiredState: State, startingState: State, startingStateStream: QueryStream): Promise<ElasticsearchAction[]>;
    protected doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
}
export {};
