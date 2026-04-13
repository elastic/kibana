import type { InteractiveModeContext } from './types';
/**
 * Selects the processor marked as the draft processor.
 */
export declare const selectDraftProcessor: (context: InteractiveModeContext) => {
    processor: (import("@kbn/streamlang").DateProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").DissectProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").DropDocumentProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").GrokProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").MathProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").RenameProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").SetProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").AppendProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").ConvertProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").RemoveByPrefixProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").RemoveProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").ReplaceProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").RedactProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").UppercaseProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").LowercaseProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").TrimProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").JoinProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").SplitProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").SortProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").ConcatProcessor & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").NetworkDirectionCommonFields & import("@kbn/streamlang").NetworkDirectionWithInternalNetworks & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").NetworkDirectionCommonFields & import("@kbn/streamlang").NetworkDirectionWithInternalNetworksField & import("@kbn/streamlang").UIAttributes) | (import("@kbn/streamlang").ManualIngestPipelineProcessor & import("@kbn/streamlang").UIAttributes);
} | {
    processor: undefined;
};
/**
 * Selects whether there are any new processors before the persisted ones.
 */
export declare const selectWhetherAnyProcessorBeforePersisted: ((state: InteractiveModeContext) => boolean) & import("reselect").OutputSelectorFields<(args_0: import("xstate").ActorRef<import("xstate").MachineSnapshot<import("../steps_state_machine").StepContext, {
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
}, import("xstate").EventObject>[]) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const stepUnderEditSelector: (context: InteractiveModeContext) => import("@kbn/streamlang").StreamlangStepWithUIAttributes | undefined;
