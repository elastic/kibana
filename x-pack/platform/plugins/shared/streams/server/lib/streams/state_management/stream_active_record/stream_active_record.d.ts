import type { Streams } from '@kbn/streams-schema';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { StateDependencies, StreamChange } from '../types';
import type { State } from '../state';
export interface ValidationResult {
    isValid: boolean;
    errors: Error[];
}
export interface PrintableStream {
    changeStatus: StreamChangeStatus;
    definition: Streams.all.Definition;
    [key: string]: unknown;
}
export type StreamChangeStatus = 'unchanged' | 'upserted' | 'deleted';
export type StreamChanges = Record<string, boolean>;
/**
 * The StreamActiveRecord is responsible for maintaining the change status of a stream
 * And routing change requests (with cascading changes), validation requests and requests to determine Elasticsearch actions
 * to the right hook based on this state
 */
export declare abstract class StreamActiveRecord<TDefinition extends Streams.all.Definition = Streams.all.Definition> {
    protected dependencies: StateDependencies;
    protected _definition: TDefinition;
    protected _changes: StreamChanges;
    private _changeStatus;
    constructor(definition: TDefinition, dependencies: StateDependencies);
    get name(): string;
    get definition(): TDefinition;
    get changeStatus(): StreamChangeStatus;
    markAsUpserted(): void;
    markAsDeleted(): void;
    hasChanged(): boolean;
    isDeleted(): boolean;
    applyChange(change: StreamChange, desiredState: State, startingState: State): Promise<StreamChange[]>;
    private delete;
    private upsert;
    validate(desiredState: State, startingState: State): Promise<ValidationResult>;
    determineElasticsearchActions(desiredState: State, startingState: State, startingStateStream?: StreamActiveRecord<TDefinition>): Promise<ElasticsearchAction[]>;
    toPrintable(): PrintableStream;
    clone(): StreamActiveRecord<TDefinition>;
    getChanges(): StreamChanges;
    setChanges(changes: StreamChanges): void;
    protected abstract doClone(): StreamActiveRecord<TDefinition>;
    protected abstract doHandleUpsertChange(definition: Streams.all.Definition, desiredState: State, startingState: State): Promise<{
        cascadingChanges: StreamChange[];
        changeStatus: StreamChangeStatus;
    }>;
    protected abstract doHandleDeleteChange(target: string, desiredState: State, startingState: State): Promise<{
        cascadingChanges: StreamChange[];
        changeStatus: StreamChangeStatus;
    }>;
    protected abstract doValidateUpsertion(desiredState: State, startingState: State): Promise<ValidationResult>;
    protected abstract doValidateDeletion(desiredState: State, startingState: State): Promise<ValidationResult>;
    protected abstract doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]>;
    protected abstract doDetermineUpdateActions(desiredState: State, startingState: State, startingStateStream: StreamActiveRecord<TDefinition>): Promise<ElasticsearchAction[]>;
    protected abstract doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
}
