import type { FailureStore, IngestStreamLifecycle } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StreamChanges, StreamChangeStatus, ValidationResult } from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';
interface ClassicStreamChanges extends StreamChanges {
    processing: boolean;
    field_overrides: boolean;
    failure_store: boolean;
    lifecycle: boolean;
    settings: boolean;
    query_streams: boolean;
}
export declare class ClassicStream extends StreamActiveRecord<Streams.ClassicStream.Definition> {
    protected _changes: ClassicStreamChanges;
    private _effectiveSettings?;
    private _dataStream?;
    constructor(definition: Streams.ClassicStream.Definition, dependencies: StateDependencies);
    private fetchDataStream;
    protected doClone(): StreamActiveRecord<Streams.ClassicStream.Definition>;
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
    hasChangedLifecycle(): boolean;
    getLifecycle(): IngestStreamLifecycle;
    getFailureStore(): FailureStore;
    protected doDetermineUpdateActions(desiredState: State, startingState: State, startingStateStream: ClassicStream): Promise<ElasticsearchAction[]>;
    private createUpsertPipelineActions;
    protected doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
    private getPipelineTargets;
    private elasticsearchActionsForReplicatedFollower;
    private getEffectiveSettings;
}
export {};
