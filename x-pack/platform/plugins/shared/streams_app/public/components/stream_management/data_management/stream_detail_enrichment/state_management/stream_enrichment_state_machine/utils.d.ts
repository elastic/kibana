import type { FieldDefinition } from '@kbn/streams-schema';
import type { AssignArgs } from 'xstate';
import type { CustomSamplesDataSource, EnrichmentDataSource, EnrichmentUrlState, FailureStoreDataSource, KqlSamplesDataSource, LatestSamplesDataSource } from '../../../../../../common/url_schema';
import type { DataSourceActorRef, DataSourceSimulationMode } from '../data_source_state_machine';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine';
import type { StepActorRef } from '../steps_state_machine';
import type { StreamEnrichmentContextType } from './types';
export declare const defaultLatestSamplesDataSource: LatestSamplesDataSource;
export declare const defaultKqlSamplesDataSource: KqlSamplesDataSource;
export declare const createDefaultCustomSamplesDataSource: (streamName: string) => CustomSamplesDataSource;
export declare const createFailureStoreDataSource: (streamName: string) => FailureStoreDataSource;
export declare const defaultEnrichmentUrlState: EnrichmentUrlState;
export declare function getDataSourcesUrlState(context: StreamEnrichmentContextType): EnrichmentDataSource[];
export declare function getActiveDataSourceSamples(context: StreamEnrichmentContextType): SampleDocumentWithUIAttributes[];
export declare function getUpsertFields(context: StreamEnrichmentContextType): FieldDefinition | undefined;
export declare const spawnDataSource: <TAssignArgs extends AssignArgs<StreamEnrichmentContextType, any, any, any>>(dataSource: EnrichmentDataSource, assignArgs: TAssignArgs) => import("xstate").AnyActorRef;
export declare function findInsertIndex(stepRefs: StepActorRef[], parentId: string | null): number;
export declare function insertAtIndex<T>(array: T[], item: T, index: number): T[];
/**
 * Moves a contiguous block of steps (step + all descendants) up or down in the steps array.
 * This means reordering around other contiguous blocks of steps.
 * Maintains a strict index-based ordering of steps that reflects the hierarchy.
 * @param stepRefs The flat array of StepActorRef
 * @param stepId The customIdentifier of the root step to move
 * @param direction 'up' or 'down'
 * @returns A new reordered array of StepActorRef
 */
export declare function reorderSteps(stepRefs: StepActorRef[], stepId: string, direction: 'up' | 'down'): StepActorRef[];
/**
 * Reorders steps for drag-and-drop operations by moving a step block directly before, after, or inside a target step.
 * Supports cross-level moves and nesting items inside condition blocks.
 * ============================
 * NOTE: The parentId update is handled separately in the state machines via a step.parentChanged event.
 * This is because the inner context of the step machine needs to be updated properly via xstate.
 * This function only handles the reordering of the stepRefs array (the array order always mimics the hierarchy).
 * @param stepRefs The flat array of StepActorRef
 * @param sourceStepId The customIdentifier of the step to move
 * @param targetStepId The customIdentifier of the target step
 * @param operation Whether to insert 'before', 'after', or 'inside' the target
 * @returns A new reordered array of StepActorRef
 */
export declare function reorderStepsByDragDrop(stepRefs: StepActorRef[], sourceStepId: string, targetStepId: string, operation: 'before' | 'after' | 'inside'): StepActorRef[];
export type RootLevelMap = Map<string, string>;
export declare function getRootLevelStepsMap(stepRefs: StepActorRef[]): Map<string, string>;
export declare function getActiveDataSourceRef(dataSourcesRefs: DataSourceActorRef[]): DataSourceActorRef | undefined;
export declare function getActiveSimulationMode(context: StreamEnrichmentContextType): DataSourceSimulationMode;
export declare function selectDataSource(dataSourcesRefs: StreamEnrichmentContextType['dataSourcesRefs'], id: string): void;
export declare const canDataSourceTypeBeOutdated: (dataSourceType: EnrichmentDataSource["type"]) => boolean;
