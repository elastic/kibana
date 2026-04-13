import { type StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { GrokCollection } from '@kbn/grok-ui';
import type { DataSourceSimulationMode } from '../data_source_state_machine';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';
import type { StepActorRef, StepInput, StepParentActor } from '../steps_state_machine';
import type { InteractiveModeContext } from './types';
export type StepSpawner = (src: 'stepMachine', options: {
    id: string;
    input: StepInput;
}) => StepActorRef;
export declare const spawnStep: (step: StreamlangStepWithUIAttributes, parentRef: StepParentActor, spawn: StepSpawner, grokCollection: GrokCollection, options?: {
    isNew: boolean;
    isUpdated?: boolean;
}) => import("xstate").ActorRef<import("xstate").MachineSnapshot<import("../steps_state_machine").StepContext, {
    type: "step.cancel";
} | {
    type: "step.changeProcessor";
    step: import("@kbn/streamlang").StreamlangProcessorDefinition;
} | {
    type: "step.changeCondition";
    step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
} | {
    type: "step.changeDescription";
    description?: string;
} | {
    type: "step.changeParent";
    parentId: string | null;
} | {
    type: "step.delete";
} | {
    type: "step.edit";
} | {
    type: "step.save";
}, {}, "draft" | "deleted" | "unresolved" | {
    configured: "idle" | "editing";
}, string, import("xstate").NonReducibleUnknown, import("xstate").MetaObject, {
    id: "processor";
    states: {
        readonly unresolved: {};
        readonly draft: {};
        readonly configured: {
            id: "configured";
            states: {
                readonly idle: {};
                readonly editing: {};
            };
        };
        readonly deleted: {
            id: "deleted";
        };
    };
}>, {
    type: "step.cancel";
} | {
    type: "step.changeProcessor";
    step: import("@kbn/streamlang").StreamlangProcessorDefinition;
} | {
    type: "step.changeCondition";
    step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
} | {
    type: "step.changeDescription";
    description?: string;
} | {
    type: "step.changeParent";
    parentId: string | null;
} | {
    type: "step.delete";
} | {
    type: "step.edit";
} | {
    type: "step.save";
}, import("xstate").EventObject>;
/**
 * Gets processors for simulation based on current editing state.
 * - If no processor is being edited: returns all new processors
 * - If a processor is being edited: returns new processors up to and including the one being edited
 */
export declare function getStepsForSimulation({ stepRefs, simulationMode, selectedConditionId, }: Pick<InteractiveModeContext, 'stepRefs'> & {
    simulationMode: DataSourceSimulationMode;
    selectedConditionId?: string;
}): StreamlangStepWithUIAttributes[];
export declare function getConfiguredSteps(context: InteractiveModeContext): StreamlangStepWithUIAttributes[];
/**
 * Gets active data source samples from the parent machine context.
 * Used for pipeline suggestion to access preview documents.
 */
export declare function getActiveDataSourceSamplesFromParent(context: InteractiveModeContext): SampleDocumentWithUIAttributes[];
