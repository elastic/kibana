import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { type StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { StreamlangConditionBlock, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { MachineImplementationsFrom } from 'xstate';
import { type ActorRefFrom, type SnapshotFrom } from 'xstate';
import type { InteractiveModeContext, InteractiveModeInput, InteractiveModeMachineDeps } from './types';
export type InteractiveModeActorRef = ActorRefFrom<typeof interactiveModeMachine>;
export type InteractiveModeSnapshot = SnapshotFrom<typeof interactiveModeMachine>;
export declare const interactiveModeMachine: import("xstate").StateMachine<InteractiveModeContext, {
    type: "step.edit";
    id?: string;
} | {
    type: "step.cancel";
    id?: string;
} | {
    type: "step.save";
    id: string;
} | {
    type: "step.changeProcessor";
    id: string;
    step: StreamlangProcessorDefinition;
} | {
    type: "step.changeCondition";
    id: string;
    step: StreamlangConditionBlock;
} | {
    type: "step.change";
    id: string;
} | {
    type: "step.parentChanged";
    id: string;
} | {
    type: "step.delete";
    id: string;
} | {
    type: "step.reorder";
    stepId: string;
    direction: "up" | "down";
} | {
    type: "step.reorderByDragDrop";
    sourceStepId: string;
    targetStepId: string;
    operation: "before" | "after" | "inside";
} | {
    type: "step.addProcessor";
    processor?: StreamlangProcessorDefinition;
    options?: {
        parentId: StreamlangStepWithUIAttributes["parentId"];
    };
} | {
    type: "step.addCondition";
    condition?: StreamlangConditionBlock;
    options?: {
        parentId: StreamlangStepWithUIAttributes["parentId"];
    };
} | {
    type: "step.duplicateProcessor";
    processorStepId: string;
} | {
    type: "step.filterByCondition";
    conditionId: string;
} | {
    type: "step.clearConditionFilter";
} | {
    type: "dataSource.activeChanged";
    simulationMode: import("../data_source_state_machine").DataSourceSimulationMode;
} | {
    type: "suggestion.generate";
    connectorId: string;
} | {
    type: "suggestion.cancel";
} | {
    type: "suggestion.accept";
} | {
    type: "suggestion.dismiss";
} | {
    type: "suggestion.regenerate";
    connectorId: string;
} | {
    type: "step.resetSteps";
    steps: StreamlangDSL["steps"];
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<StreamlangDSL, import("./suggest_pipeline_actor").SuggestPipelineInputMinimal, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("../steps_state_machine").StepContext, {
        type: "step.cancel";
    } | {
        type: "step.changeProcessor";
        step: StreamlangProcessorDefinition;
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
    }, {}, never, {
        type: "changeCondition";
        params: {
            step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
        };
    } | {
        type: "changeProcessor";
        params: {
            step: StreamlangProcessorDefinition;
        };
    } | {
        type: "changeDescription";
        params: {
            description?: string;
        };
    } | {
        type: "changeParent";
        params: {
            parentId: string | null;
        };
    } | {
        type: "resetToPrevious";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "markAsUpdated";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "forwardEventToParent";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepSave";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepCancel";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepEdit";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "forwardChangeEventToParent";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "forwardParentChangeEventToParent";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepDelete";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "updateGrokPatternDefinitions";
        params: unknown;
    } | {
        type: "clearGrokPatternDefinitions";
        params: unknown;
    }, {
        type: "isDraft";
        params: unknown;
    } | {
        type: "isUpdated";
        params: unknown;
    }, never, "draft" | "deleted" | "unresolved" | {
        configured: "idle" | "editing";
    }, string, import("../steps_state_machine").StepInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    }>> | undefined;
}, {
    src: "suggestPipeline";
    logic: import("xstate").PromiseActorLogic<StreamlangDSL, import("./suggest_pipeline_actor").SuggestPipelineInputMinimal, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "stepMachine";
    logic: import("xstate").StateMachine<import("../steps_state_machine").StepContext, {
        type: "step.cancel";
    } | {
        type: "step.changeProcessor";
        step: StreamlangProcessorDefinition;
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
    }, {}, never, {
        type: "changeCondition";
        params: {
            step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
        };
    } | {
        type: "changeProcessor";
        params: {
            step: StreamlangProcessorDefinition;
        };
    } | {
        type: "changeDescription";
        params: {
            description?: string;
        };
    } | {
        type: "changeParent";
        params: {
            parentId: string | null;
        };
    } | {
        type: "resetToPrevious";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "markAsUpdated";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "forwardEventToParent";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepSave";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepCancel";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepEdit";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "forwardChangeEventToParent";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "forwardParentChangeEventToParent";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifyStepDelete";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "updateGrokPatternDefinitions";
        params: unknown;
    } | {
        type: "clearGrokPatternDefinitions";
        params: unknown;
    }, {
        type: "isDraft";
        params: unknown;
    } | {
        type: "isUpdated";
        params: unknown;
    }, never, "draft" | "deleted" | "unresolved" | {
        configured: "idle" | "editing";
    }, string, import("../steps_state_machine").StepInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    }>;
    id: string | undefined;
}, {
    type: "setActiveDataSource";
    params: {
        simulationMode: InteractiveModeContext["simulationMode"];
    };
} | {
    type: "sendStepsToSimulator";
    params: import("xstate").NonReducibleUnknown;
} | {
    type: "notifySuggestionFailure";
    params: {
        event: {
            error: unknown;
        };
    };
} | {
    type: "addProcessor";
    params: {
        processor?: StreamlangProcessorDefinition;
        options?: {
            parentId: StreamlangStepWithUIAttributes["parentId"];
        };
    };
} | {
    type: "duplicateProcessor";
    params: {
        processorStepId: string;
    };
} | {
    type: "addCondition";
    params: {
        condition?: StreamlangConditionBlock;
        options?: {
            parentId: StreamlangStepWithUIAttributes["parentId"];
        };
    };
} | {
    type: "maybeAutoSelectParentConditionForProcessor";
    params: {
        id?: string;
    };
} | {
    type: "deleteStep";
    params: {
        id: string;
    };
} | {
    type: "reorderSteps";
    params: {
        stepId: string;
        direction: "up" | "down";
    };
} | {
    type: "reorderStepsByDragDrop";
    params: {
        sourceStepId: string;
        targetStepId: string;
        operation: "before" | "after" | "inside";
    };
} | {
    type: "reassignSteps";
    params: import("xstate").NonReducibleUnknown;
} | {
    type: "syncToDSL";
    params: unknown;
} | {
    type: "storeConditionFilter";
    params: {
        conditionId: string | undefined;
    };
} | {
    type: "overwriteSteps";
    params: {
        steps: StreamlangDSL["steps"];
    };
} | {
    type: "storeSuggestedPipeline";
    params: {
        pipeline: StreamlangDSL;
    };
} | {
    type: "clearSuggestion";
    params: import("xstate").NonReducibleUnknown;
}, {
    type: "hasManagePrivileges";
    params: unknown;
} | {
    type: "hasSimulatePrivileges";
    params: unknown;
} | {
    type: "hasStagedChanges";
    params: unknown;
}, never, {
    steps: "idle" | "editing" | "creating";
    pipelineSuggestion: "idle" | "generatingSuggestion" | "viewingSuggestion" | "noSuggestionsFound";
}, string, InteractiveModeInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "interactiveMode";
    states: {
        readonly pipelineSuggestion: {
            states: {
                readonly idle: {};
                readonly generatingSuggestion: {};
                readonly noSuggestionsFound: {};
                readonly viewingSuggestion: {};
            };
        };
        readonly steps: {
            states: {
                readonly idle: {};
                readonly creating: {};
                readonly editing: {};
            };
        };
    };
}>;
export declare const createInteractiveModeMachineImplementations: ({ streamsRepositoryClient, toasts, telemetryClient, notifications, }: InteractiveModeMachineDeps) => MachineImplementationsFrom<typeof interactiveModeMachine>;
