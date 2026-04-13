import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import type { MappedSchemaField } from '../../../schema_editor/types';
import type { PreviewDocsFilterOption } from './simulation_documents_search';
import type { SampleDocumentWithUIAttributes, Simulation, SimulationContext, SimulationInput, SimulationMachineDeps } from './types';
export type SimulationActorRef = ActorRefFrom<typeof simulationMachine>;
export type SimulationActorSnapshot = SnapshotFrom<typeof simulationMachine>;
export interface StepsEventParams {
    steps: StreamlangStepWithUIAttributes[];
}
export declare const simulationMachine: import("xstate").StateMachine<SimulationContext, {
    type: "previewColumns.order";
    columns: string[];
} | {
    type: "previewColumns.setSorting";
    sorting: SimulationContext["previewColumnsSorting"];
} | {
    type: "previewColumns.updateExplicitlyDisabledColumns";
    columns: string[];
} | {
    type: "previewColumns.updateExplicitlyEnabledColumns";
    columns: string[];
} | {
    type: "simulation.filterByCondition";
    conditionId: string;
} | {
    type: "simulation.clearConditionFilter";
} | {
    type: "simulation.changePreviewDocsFilter";
    filter: PreviewDocsFilterOption;
} | {
    type: "simulation.fields.map";
    field: MappedSchemaField;
} | {
    type: "simulation.fields.unmap";
    fieldName: string;
} | {
    type: "simulation.receive_samples";
    samples: SampleDocumentWithUIAttributes[];
} | {
    type: "simulation.receive_steps";
    steps: StreamlangStepWithUIAttributes[];
} | {
    type: "simulation.updateSteps";
    steps: StreamlangStepWithUIAttributes[];
} | {
    type: "simulation.reset";
} | {
    type: "step.change";
    steps: StreamlangStepWithUIAttributes[];
} | {
    type: "step.delete";
    steps: StreamlangStepWithUIAttributes[];
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("@kbn/streams-schema").ProcessingSimulationResponse, import("./simulation_runner_actor").SimulationRunnerInput, import("xstate").EventObject>> | undefined;
}, {
    src: "runSimulation";
    logic: import("xstate").PromiseActorLogic<import("@kbn/streams-schema").ProcessingSimulationResponse, import("./simulation_runner_actor").SimulationRunnerInput, import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "notifySimulationRunFailure";
    params: unknown;
} | {
    type: "storePreviewDocsFilter";
    params: {
        filter: PreviewDocsFilterOption;
    };
} | {
    type: "storeSteps";
    params: StepsEventParams;
} | {
    type: "storeSamples";
    params: {
        samples: SampleDocumentWithUIAttributes[];
    };
} | {
    type: "storeSimulation";
    params: {
        simulation: Simulation | undefined;
    };
} | {
    type: "storeExplicitlyEnabledPreviewColumns";
    params: {
        columns: string[];
    };
} | {
    type: "storeExplicitlyDisabledPreviewColumns";
    params: {
        columns: string[];
    };
} | {
    type: "storePreviewColumnsOrder";
    params: {
        columns: string[];
    };
} | {
    type: "storePreviewColumnsSorting";
    params: {
        sorting: SimulationContext["previewColumnsSorting"];
    };
} | {
    type: "deriveDetectedSchemaFields";
    params: unknown;
} | {
    type: "mapField";
    params: {
        field: MappedSchemaField;
    };
} | {
    type: "unmapField";
    params: {
        fieldName: string;
    };
} | {
    type: "resetSimulationOutcome";
    params: unknown;
} | {
    type: "resetSteps";
    params: unknown;
} | {
    type: "resetSamples";
    params: unknown;
} | {
    type: "applyConditionFilter";
    params: {
        conditionId: string;
    };
} | {
    type: "clearConditionFilter";
    params: unknown;
}, {
    type: "canSimulate";
    params: unknown;
} | {
    type: "hasSteps";
    params: StepsEventParams;
} | {
    type: "!hasSamples";
    params: {
        samples: SampleDocumentWithUIAttributes[];
    };
}, "processorChangeDebounceTime", "idle" | "assertingRequirements" | "debouncingChanges" | "runningSimulation", string, SimulationInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "simulation";
    states: {
        readonly idle: {};
        readonly debouncingChanges: {};
        readonly assertingRequirements: {};
        readonly runningSimulation: {};
    };
}>;
export declare const createSimulationMachineImplementations: ({ streamsRepositoryClient, toasts, }: SimulationMachineDeps) => MachineImplementationsFrom<typeof simulationMachine>;
