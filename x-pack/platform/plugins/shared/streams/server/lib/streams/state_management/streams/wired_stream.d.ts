import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies, StreamChange } from '../types';
import type { StreamChangeStatus, StreamChanges, ValidationResult } from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
interface WiredStreamChanges extends StreamChanges {
    ownFields: boolean;
    routing: boolean;
    processing: boolean;
    failure_store: boolean;
    lifecycle: boolean;
    settings: boolean;
    query_streams: boolean;
    draft: boolean;
}
export declare class WiredStream extends StreamActiveRecord<Streams.WiredStream.Definition> {
    protected _changes: WiredStreamChanges;
    constructor(definition: Streams.WiredStream.Definition, dependencies: StateDependencies);
    protected doClone(): StreamActiveRecord<Streams.WiredStream.Definition>;
    protected doHandleUpsertChange(definition: Streams.all.Definition, desiredState: State, startingState: State): Promise<{
        cascadingChanges: StreamChange[];
        changeStatus: StreamChangeStatus;
    }>;
    protected doHandleDeleteChange(target: string, desiredState: State, startingState: State): Promise<{
        cascadingChanges: StreamChange[];
        changeStatus: StreamChangeStatus;
    }>;
    protected doValidateUpsertion(desiredState: State, startingState: State): Promise<ValidationResult>;
    private getMatchingDataStream;
    protected doValidateDeletion(desiredState: State, startingState: State): Promise<ValidationResult>;
    private assertNoHierarchicalConflicts;
    private isStreamNameTaken;
    protected doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]>;
    private getNonDraftDestinations;
    private getDraftDestinations;
    hasChangedFields(): boolean;
    hasChangedLifecycle(): boolean;
    hasChangedFailureStore(): boolean;
    hasChangedSettings(): boolean;
    getLifecycle(): IngestStreamLifecycle;
    getFailureStore(): FailureStore;
    private getInheritedFailureStoreFromAncestors;
    protected doDetermineUpdateActions(desiredState: State, startingState: State, startingStateStream: WiredStream): Promise<ElasticsearchAction[]>;
    protected doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
}
export {};
