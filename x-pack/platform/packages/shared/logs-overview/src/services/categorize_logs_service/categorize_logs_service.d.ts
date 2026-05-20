import type { MachineImplementationsFrom } from 'xstate';
import type { LogCategory } from '../../types';
import type { CategorizeLogsServiceDependencies, LogCategorizationParams } from './types';
export declare const categorizeLogsService: import("xstate").StateMachine<{
    categories: LogCategory[];
    documentCount: number;
    error?: Error;
    hasReachedLimit: boolean;
    parameters: LogCategorizationParams;
    samplingProbability: number;
}, {
    type: "cancel";
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        documentCount: number;
        samplingProbability: number;
    }, LogCategorizationParams, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        categories: LogCategory[];
        hasReachedLimit: boolean;
    }, LogCategorizationParams & {
        samplingProbability: number;
        ignoredCategoryTerms: string[];
        minDocsPerCategory: number;
    }, import("xstate").EventObject>> | undefined;
}, {
    src: "countDocuments";
    logic: import("xstate").PromiseActorLogic<{
        documentCount: number;
        samplingProbability: number;
    }, LogCategorizationParams, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "categorizeDocuments";
    logic: import("xstate").PromiseActorLogic<{
        categories: LogCategory[];
        hasReachedLimit: boolean;
    }, LogCategorizationParams & {
        samplingProbability: number;
        ignoredCategoryTerms: string[];
        minDocsPerCategory: number;
    }, import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "storeError";
    params: {
        error: unknown;
    };
} | {
    type: "storeCategories";
    params: {
        categories: LogCategory[];
        hasReachedLimit: boolean;
    };
} | {
    type: "storeDocumentCount";
    params: {
        documentCount: number;
        samplingProbability: number;
    };
}, {
    type: "hasTooFewDocuments";
    params: {
        documentCount: number;
    };
} | {
    type: "requiresSampling";
    params: {
        samplingProbability: number;
    };
}, never, "done" | "failed" | "countingDocuments" | "fetchingSampledCategories" | "fetchingRemainingCategories", string, LogCategorizationParams, {
    categories: LogCategory[];
    documentCount: number;
    hasReachedLimit: boolean;
    samplingProbability: number;
}, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "categorizeLogs";
    states: {
        readonly countingDocuments: {};
        readonly fetchingSampledCategories: {};
        readonly fetchingRemainingCategories: {};
        readonly failed: {};
        readonly done: {};
    };
}>;
export declare const CategorizeLogsServiceContext: {
    useSelector: <T>(selector: (snapshot: import("xstate").MachineSnapshot<{
        categories: LogCategory[];
        documentCount: number;
        error?: Error;
        hasReachedLimit: boolean;
        parameters: LogCategorizationParams;
        samplingProbability: number;
    }, {
        type: "cancel";
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
            documentCount: number;
            samplingProbability: number;
        }, LogCategorizationParams, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
            categories: LogCategory[];
            hasReachedLimit: boolean;
        }, LogCategorizationParams & {
            samplingProbability: number;
            ignoredCategoryTerms: string[];
            minDocsPerCategory: number;
        }, import("xstate").EventObject>> | undefined;
    }, "done" | "failed" | "countingDocuments" | "fetchingSampledCategories" | "fetchingRemainingCategories", string, {
        categories: LogCategory[];
        documentCount: number;
        hasReachedLimit: boolean;
        samplingProbability: number;
    }, import("xstate").MetaObject, {
        id: "categorizeLogs";
        states: {
            readonly countingDocuments: {};
            readonly fetchingSampledCategories: {};
            readonly fetchingRemainingCategories: {};
            readonly failed: {};
            readonly done: {};
        };
    }>) => T, compare?: ((a: T, b: T) => boolean) | undefined) => T;
    useActorRef: () => import("xstate").Actor<import("xstate").StateMachine<{
        categories: LogCategory[];
        documentCount: number;
        error?: Error;
        hasReachedLimit: boolean;
        parameters: LogCategorizationParams;
        samplingProbability: number;
    }, {
        type: "cancel";
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
            documentCount: number;
            samplingProbability: number;
        }, LogCategorizationParams, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
            categories: LogCategory[];
            hasReachedLimit: boolean;
        }, LogCategorizationParams & {
            samplingProbability: number;
            ignoredCategoryTerms: string[];
            minDocsPerCategory: number;
        }, import("xstate").EventObject>> | undefined;
    }, {
        src: "countDocuments";
        logic: import("xstate").PromiseActorLogic<{
            documentCount: number;
            samplingProbability: number;
        }, LogCategorizationParams, import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "categorizeDocuments";
        logic: import("xstate").PromiseActorLogic<{
            categories: LogCategory[];
            hasReachedLimit: boolean;
        }, LogCategorizationParams & {
            samplingProbability: number;
            ignoredCategoryTerms: string[];
            minDocsPerCategory: number;
        }, import("xstate").EventObject>;
        id: string | undefined;
    }, {
        type: "storeError";
        params: {
            error: unknown;
        };
    } | {
        type: "storeCategories";
        params: {
            categories: LogCategory[];
            hasReachedLimit: boolean;
        };
    } | {
        type: "storeDocumentCount";
        params: {
            documentCount: number;
            samplingProbability: number;
        };
    }, {
        type: "hasTooFewDocuments";
        params: {
            documentCount: number;
        };
    } | {
        type: "requiresSampling";
        params: {
            samplingProbability: number;
        };
    }, never, "done" | "failed" | "countingDocuments" | "fetchingSampledCategories" | "fetchingRemainingCategories", string, LogCategorizationParams, {
        categories: LogCategory[];
        documentCount: number;
        hasReachedLimit: boolean;
        samplingProbability: number;
    }, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "categorizeLogs";
        states: {
            readonly countingDocuments: {};
            readonly fetchingSampledCategories: {};
            readonly fetchingRemainingCategories: {};
            readonly failed: {};
            readonly done: {};
        };
    }>>;
    Provider: (props: {
        children: React.ReactNode;
        options?: import("xstate").ActorOptions<import("xstate").StateMachine<{
            categories: LogCategory[];
            documentCount: number;
            error?: Error;
            hasReachedLimit: boolean;
            parameters: LogCategorizationParams;
            samplingProbability: number;
        }, {
            type: "cancel";
        }, {
            [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
                documentCount: number;
                samplingProbability: number;
            }, LogCategorizationParams, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
                categories: LogCategory[];
                hasReachedLimit: boolean;
            }, LogCategorizationParams & {
                samplingProbability: number;
                ignoredCategoryTerms: string[];
                minDocsPerCategory: number;
            }, import("xstate").EventObject>> | undefined;
        }, {
            src: "countDocuments";
            logic: import("xstate").PromiseActorLogic<{
                documentCount: number;
                samplingProbability: number;
            }, LogCategorizationParams, import("xstate").EventObject>;
            id: string | undefined;
        } | {
            src: "categorizeDocuments";
            logic: import("xstate").PromiseActorLogic<{
                categories: LogCategory[];
                hasReachedLimit: boolean;
            }, LogCategorizationParams & {
                samplingProbability: number;
                ignoredCategoryTerms: string[];
                minDocsPerCategory: number;
            }, import("xstate").EventObject>;
            id: string | undefined;
        }, {
            type: "storeError";
            params: {
                error: unknown;
            };
        } | {
            type: "storeCategories";
            params: {
                categories: LogCategory[];
                hasReachedLimit: boolean;
            };
        } | {
            type: "storeDocumentCount";
            params: {
                documentCount: number;
                samplingProbability: number;
            };
        }, {
            type: "hasTooFewDocuments";
            params: {
                documentCount: number;
            };
        } | {
            type: "requiresSampling";
            params: {
                samplingProbability: number;
            };
        }, never, "done" | "failed" | "countingDocuments" | "fetchingSampledCategories" | "fetchingRemainingCategories", string, LogCategorizationParams, {
            categories: LogCategory[];
            documentCount: number;
            hasReachedLimit: boolean;
            samplingProbability: number;
        }, import("xstate").EventObject, import("xstate").MetaObject, {
            id: "categorizeLogs";
            states: {
                readonly countingDocuments: {};
                readonly fetchingSampledCategories: {};
                readonly fetchingRemainingCategories: {};
                readonly failed: {};
                readonly done: {};
            };
        }>> | undefined;
        machine?: never;
        logic?: import("xstate").StateMachine<{
            categories: LogCategory[];
            documentCount: number;
            error?: Error;
            hasReachedLimit: boolean;
            parameters: LogCategorizationParams;
            samplingProbability: number;
        }, {
            type: "cancel";
        }, {
            [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
                documentCount: number;
                samplingProbability: number;
            }, LogCategorizationParams, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
                categories: LogCategory[];
                hasReachedLimit: boolean;
            }, LogCategorizationParams & {
                samplingProbability: number;
                ignoredCategoryTerms: string[];
                minDocsPerCategory: number;
            }, import("xstate").EventObject>> | undefined;
        }, {
            src: "countDocuments";
            logic: import("xstate").PromiseActorLogic<{
                documentCount: number;
                samplingProbability: number;
            }, LogCategorizationParams, import("xstate").EventObject>;
            id: string | undefined;
        } | {
            src: "categorizeDocuments";
            logic: import("xstate").PromiseActorLogic<{
                categories: LogCategory[];
                hasReachedLimit: boolean;
            }, LogCategorizationParams & {
                samplingProbability: number;
                ignoredCategoryTerms: string[];
                minDocsPerCategory: number;
            }, import("xstate").EventObject>;
            id: string | undefined;
        }, {
            type: "storeError";
            params: {
                error: unknown;
            };
        } | {
            type: "storeCategories";
            params: {
                categories: LogCategory[];
                hasReachedLimit: boolean;
            };
        } | {
            type: "storeDocumentCount";
            params: {
                documentCount: number;
                samplingProbability: number;
            };
        }, {
            type: "hasTooFewDocuments";
            params: {
                documentCount: number;
            };
        } | {
            type: "requiresSampling";
            params: {
                samplingProbability: number;
            };
        }, never, "done" | "failed" | "countingDocuments" | "fetchingSampledCategories" | "fetchingRemainingCategories", string, LogCategorizationParams, {
            categories: LogCategory[];
            documentCount: number;
            hasReachedLimit: boolean;
            samplingProbability: number;
        }, import("xstate").EventObject, import("xstate").MetaObject, {
            id: "categorizeLogs";
            states: {
                readonly countingDocuments: {};
                readonly fetchingSampledCategories: {};
                readonly fetchingRemainingCategories: {};
                readonly failed: {};
                readonly done: {};
            };
        }> | undefined;
    }) => React.ReactElement<any, any>;
};
export declare const createCategorizeLogsServiceImplementations: ({ search, }: CategorizeLogsServiceDependencies) => MachineImplementationsFrom<typeof categorizeLogsService>;
