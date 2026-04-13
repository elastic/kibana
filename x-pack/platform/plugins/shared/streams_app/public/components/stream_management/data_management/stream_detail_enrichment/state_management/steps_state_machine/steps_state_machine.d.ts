import type { ActorRefFrom, SnapshotFrom } from 'xstate';
import type { StreamlangProcessorDefinition, StreamlangConditionBlockWithUIAttributes } from '@kbn/streamlang';
import type { StepContext, StepInput } from './types';
export type StepActorRef = ActorRefFrom<typeof stepMachine>;
export type StepActorSnapshot = SnapshotFrom<typeof stepMachine>;
export declare const stepMachine: import("xstate").StateMachine<StepContext, {
    type: "step.cancel";
} | {
    type: "step.changeProcessor";
    step: StreamlangProcessorDefinition;
} | {
    type: "step.changeCondition";
    step: StreamlangConditionBlockWithUIAttributes;
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
        step: StreamlangConditionBlockWithUIAttributes;
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
}, string, StepInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
