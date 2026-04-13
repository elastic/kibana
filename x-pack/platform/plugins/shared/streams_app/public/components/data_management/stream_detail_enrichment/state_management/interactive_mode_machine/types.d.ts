import type { IToasts, NotificationsStart } from '@kbn/core/public';
import type { GrokCollection } from '@kbn/grok-ui';
import type { StreamlangProcessorDefinition, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamlangConditionBlock, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import type { DataSourceActorRef, DataSourceSimulationMode } from '../data_source_state_machine';
import type { SimulationActorRef } from '../simulation_state_machine';
import type { StepActorRef } from '../steps_state_machine';
import type { StreamPrivileges } from '../stream_enrichment_state_machine/types';
export interface InteractiveModeMachineDeps {
    streamsRepositoryClient: StreamsRepositoryClient;
    notifications: NotificationsStart;
    toasts: IToasts;
    telemetryClient: StreamsTelemetryClient;
}
export type InteractiveModeToParentEvent = {
    type: 'mode.dslUpdated';
    dsl: StreamlangDSL;
} | {
    type: 'simulation.reset';
} | {
    type: 'simulation.updateSteps';
    steps: StreamlangStepWithUIAttributes[];
} | {
    type: 'simulation.filterByConditionAuto';
    conditionId: string;
} | {
    type: 'simulation.clearAutoConditionFilter';
};
interface InteractiveModeParentSnapshot {
    context: {
        simulatorRef: SimulationActorRef;
        dataSourcesRefs: DataSourceActorRef[];
        schemaErrors: string[];
        validationErrors: Map<string, unknown>;
    };
}
export interface InteractiveModeParentRef {
    getSnapshot(): InteractiveModeParentSnapshot;
    send: (event: InteractiveModeToParentEvent) => void;
}
export interface InteractiveModeContext {
    stepRefs: StepActorRef[];
    initialStepRefs: StepActorRef[];
    parentRef: InteractiveModeParentRef;
    privileges: StreamPrivileges;
    simulationMode: DataSourceSimulationMode;
    streamName: string;
    suggestedPipeline?: StreamlangDSL;
    selectedConditionId?: string;
    grokCollection: GrokCollection;
}
export interface InteractiveModeInput {
    dsl: StreamlangDSL;
    newStepIds: string[];
    parentRef: InteractiveModeParentRef;
    privileges: StreamPrivileges;
    simulationMode: DataSourceSimulationMode;
    streamName: string;
    grokCollection: GrokCollection;
}
export type InteractiveModeEvent = {
    type: 'step.edit';
    id?: string;
} | {
    type: 'step.cancel';
    id?: string;
} | {
    type: 'step.save';
    id: string;
} | {
    type: 'step.changeProcessor';
    id: string;
    step: StreamlangProcessorDefinition;
} | {
    type: 'step.changeCondition';
    id: string;
    step: StreamlangConditionBlock;
} | {
    type: 'step.change';
    id: string;
} | {
    type: 'step.parentChanged';
    id: string;
} | {
    type: 'step.delete';
    id: string;
} | {
    type: 'step.reorder';
    stepId: string;
    direction: 'up' | 'down';
} | {
    type: 'step.reorderByDragDrop';
    sourceStepId: string;
    targetStepId: string;
    operation: 'before' | 'after' | 'inside';
} | {
    type: 'step.addProcessor';
    processor?: StreamlangProcessorDefinition;
    options?: {
        parentId: StreamlangStepWithUIAttributes['parentId'];
    };
} | {
    type: 'step.addCondition';
    condition?: StreamlangConditionBlock;
    options?: {
        parentId: StreamlangStepWithUIAttributes['parentId'];
    };
} | {
    type: 'step.duplicateProcessor';
    processorStepId: string;
} | {
    type: 'step.filterByCondition';
    conditionId: string;
} | {
    type: 'step.clearConditionFilter';
} | {
    type: 'dataSource.activeChanged';
    simulationMode: DataSourceSimulationMode;
} | {
    type: 'suggestion.generate';
    connectorId: string;
} | {
    type: 'suggestion.cancel';
} | {
    type: 'suggestion.accept';
} | {
    type: 'suggestion.dismiss';
} | {
    type: 'suggestion.regenerate';
    connectorId: string;
} | {
    type: 'step.resetSteps';
    steps: StreamlangDSL['steps'];
};
export {};
