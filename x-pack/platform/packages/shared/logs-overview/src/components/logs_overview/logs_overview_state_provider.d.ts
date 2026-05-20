import type { LogsOverviewFeatureFlags } from '../../types';
import type { LogsSourceConfiguration, ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import type { MlCapabilities } from '../../utils/ml_capabilities';
export declare const logsOverviewStateMachine: import("xstate").StateMachine<{
    error?: Error;
    featureFlags: LogsOverviewFeatureFlags;
    logsSource: {
        status: "unresolved";
        value: LogsSourceConfiguration;
    } | {
        status: "resolved";
        value: ResolvedIndexNameLogsSourceConfiguration;
    };
    mlCapabilities: {
        status: "unresolved";
    } | MlCapabilities;
}, import("xstate").AnyEventObject, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
        logsSource: LogsSourceConfiguration;
    }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<MlCapabilities, {
        featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
    }, import("xstate").EventObject>> | undefined;
}, {
    src: "resolveLogsSource";
    logic: import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
        logsSource: LogsSourceConfiguration;
    }, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadMlCapabilities";
    logic: import("xstate").PromiseActorLogic<MlCapabilities, {
        featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
    }, import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "storeError";
    params: {
        error: unknown;
    };
} | {
    type: "storeResolvedLogsSource";
    params: {
        logsSource: ResolvedIndexNameLogsSourceConfiguration;
    };
} | {
    type: "storeMlCapabilities";
    params: {
        mlCapabilities: MlCapabilities;
    };
}, {
    type: "isMlAvailable";
    params: unknown;
}, never, "showingLogEvents" | "failedToInitialize" | "showingLogCategories" | {
    initializing: {
        mlCapabilities: "loading" | "loaded";
        logsSource: "resolving" | "resolved";
    };
}, string, {
    featureFlags: LogsOverviewFeatureFlags;
    logsSource: LogsSourceConfiguration;
}, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "logsOverviewStateMachine";
    states: {
        readonly initializing: {
            states: {
                readonly logsSource: {
                    states: {
                        readonly resolving: {};
                        readonly resolved: {};
                    };
                };
                readonly mlCapabilities: {
                    states: {
                        readonly loading: {};
                        readonly loaded: {};
                    };
                };
            };
        };
        readonly failedToInitialize: {};
        readonly showingLogEvents: {};
        readonly showingLogCategories: {};
    };
}>;
export declare const LogsOverviewStateContext: {
    useSelector: <T>(selector: (snapshot: import("xstate").MachineSnapshot<{
        error?: Error;
        featureFlags: LogsOverviewFeatureFlags;
        logsSource: {
            status: "unresolved";
            value: LogsSourceConfiguration;
        } | {
            status: "resolved";
            value: ResolvedIndexNameLogsSourceConfiguration;
        };
        mlCapabilities: {
            status: "unresolved";
        } | MlCapabilities;
    }, import("xstate").AnyEventObject, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
            logsSource: LogsSourceConfiguration;
        }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<MlCapabilities, {
            featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
        }, import("xstate").EventObject>> | undefined;
    }, "showingLogEvents" | "failedToInitialize" | "showingLogCategories" | {
        initializing: {
            mlCapabilities: "loading" | "loaded";
            logsSource: "resolving" | "resolved";
        };
    }, string, import("xstate").NonReducibleUnknown, import("xstate").MetaObject, {
        id: "logsOverviewStateMachine";
        states: {
            readonly initializing: {
                states: {
                    readonly logsSource: {
                        states: {
                            readonly resolving: {};
                            readonly resolved: {};
                        };
                    };
                    readonly mlCapabilities: {
                        states: {
                            readonly loading: {};
                            readonly loaded: {};
                        };
                    };
                };
            };
            readonly failedToInitialize: {};
            readonly showingLogEvents: {};
            readonly showingLogCategories: {};
        };
    }>) => T, compare?: ((a: T, b: T) => boolean) | undefined) => T;
    useActorRef: () => import("xstate").Actor<import("xstate").StateMachine<{
        error?: Error;
        featureFlags: LogsOverviewFeatureFlags;
        logsSource: {
            status: "unresolved";
            value: LogsSourceConfiguration;
        } | {
            status: "resolved";
            value: ResolvedIndexNameLogsSourceConfiguration;
        };
        mlCapabilities: {
            status: "unresolved";
        } | MlCapabilities;
    }, import("xstate").AnyEventObject, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
            logsSource: LogsSourceConfiguration;
        }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<MlCapabilities, {
            featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
        }, import("xstate").EventObject>> | undefined;
    }, {
        src: "resolveLogsSource";
        logic: import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
            logsSource: LogsSourceConfiguration;
        }, import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "loadMlCapabilities";
        logic: import("xstate").PromiseActorLogic<MlCapabilities, {
            featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
        }, import("xstate").EventObject>;
        id: string | undefined;
    }, {
        type: "storeError";
        params: {
            error: unknown;
        };
    } | {
        type: "storeResolvedLogsSource";
        params: {
            logsSource: ResolvedIndexNameLogsSourceConfiguration;
        };
    } | {
        type: "storeMlCapabilities";
        params: {
            mlCapabilities: MlCapabilities;
        };
    }, {
        type: "isMlAvailable";
        params: unknown;
    }, never, "showingLogEvents" | "failedToInitialize" | "showingLogCategories" | {
        initializing: {
            mlCapabilities: "loading" | "loaded";
            logsSource: "resolving" | "resolved";
        };
    }, string, {
        featureFlags: LogsOverviewFeatureFlags;
        logsSource: LogsSourceConfiguration;
    }, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "logsOverviewStateMachine";
        states: {
            readonly initializing: {
                states: {
                    readonly logsSource: {
                        states: {
                            readonly resolving: {};
                            readonly resolved: {};
                        };
                    };
                    readonly mlCapabilities: {
                        states: {
                            readonly loading: {};
                            readonly loaded: {};
                        };
                    };
                };
            };
            readonly failedToInitialize: {};
            readonly showingLogEvents: {};
            readonly showingLogCategories: {};
        };
    }>>;
    Provider: (props: {
        children: React.ReactNode;
        options?: import("xstate").ActorOptions<import("xstate").StateMachine<{
            error?: Error;
            featureFlags: LogsOverviewFeatureFlags;
            logsSource: {
                status: "unresolved";
                value: LogsSourceConfiguration;
            } | {
                status: "resolved";
                value: ResolvedIndexNameLogsSourceConfiguration;
            };
            mlCapabilities: {
                status: "unresolved";
            } | MlCapabilities;
        }, import("xstate").AnyEventObject, {
            [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
                logsSource: LogsSourceConfiguration;
            }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<MlCapabilities, {
                featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
            }, import("xstate").EventObject>> | undefined;
        }, {
            src: "resolveLogsSource";
            logic: import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
                logsSource: LogsSourceConfiguration;
            }, import("xstate").EventObject>;
            id: string | undefined;
        } | {
            src: "loadMlCapabilities";
            logic: import("xstate").PromiseActorLogic<MlCapabilities, {
                featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
            }, import("xstate").EventObject>;
            id: string | undefined;
        }, {
            type: "storeError";
            params: {
                error: unknown;
            };
        } | {
            type: "storeResolvedLogsSource";
            params: {
                logsSource: ResolvedIndexNameLogsSourceConfiguration;
            };
        } | {
            type: "storeMlCapabilities";
            params: {
                mlCapabilities: MlCapabilities;
            };
        }, {
            type: "isMlAvailable";
            params: unknown;
        }, never, "showingLogEvents" | "failedToInitialize" | "showingLogCategories" | {
            initializing: {
                mlCapabilities: "loading" | "loaded";
                logsSource: "resolving" | "resolved";
            };
        }, string, {
            featureFlags: LogsOverviewFeatureFlags;
            logsSource: LogsSourceConfiguration;
        }, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
            id: "logsOverviewStateMachine";
            states: {
                readonly initializing: {
                    states: {
                        readonly logsSource: {
                            states: {
                                readonly resolving: {};
                                readonly resolved: {};
                            };
                        };
                        readonly mlCapabilities: {
                            states: {
                                readonly loading: {};
                                readonly loaded: {};
                            };
                        };
                    };
                };
                readonly failedToInitialize: {};
                readonly showingLogEvents: {};
                readonly showingLogCategories: {};
            };
        }>> | undefined;
        machine?: never;
        logic?: import("xstate").StateMachine<{
            error?: Error;
            featureFlags: LogsOverviewFeatureFlags;
            logsSource: {
                status: "unresolved";
                value: LogsSourceConfiguration;
            } | {
                status: "resolved";
                value: ResolvedIndexNameLogsSourceConfiguration;
            };
            mlCapabilities: {
                status: "unresolved";
            } | MlCapabilities;
        }, import("xstate").AnyEventObject, {
            [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
                logsSource: LogsSourceConfiguration;
            }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<MlCapabilities, {
                featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
            }, import("xstate").EventObject>> | undefined;
        }, {
            src: "resolveLogsSource";
            logic: import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
                logsSource: LogsSourceConfiguration;
            }, import("xstate").EventObject>;
            id: string | undefined;
        } | {
            src: "loadMlCapabilities";
            logic: import("xstate").PromiseActorLogic<MlCapabilities, {
                featureFlags: import("../../utils/ml_capabilities").MlFeatureFlags;
            }, import("xstate").EventObject>;
            id: string | undefined;
        }, {
            type: "storeError";
            params: {
                error: unknown;
            };
        } | {
            type: "storeResolvedLogsSource";
            params: {
                logsSource: ResolvedIndexNameLogsSourceConfiguration;
            };
        } | {
            type: "storeMlCapabilities";
            params: {
                mlCapabilities: MlCapabilities;
            };
        }, {
            type: "isMlAvailable";
            params: unknown;
        }, never, "showingLogEvents" | "failedToInitialize" | "showingLogCategories" | {
            initializing: {
                mlCapabilities: "loading" | "loaded";
                logsSource: "resolving" | "resolved";
            };
        }, string, {
            featureFlags: LogsOverviewFeatureFlags;
            logsSource: LogsSourceConfiguration;
        }, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
            id: "logsOverviewStateMachine";
            states: {
                readonly initializing: {
                    states: {
                        readonly logsSource: {
                            states: {
                                readonly resolving: {};
                                readonly resolved: {};
                            };
                        };
                        readonly mlCapabilities: {
                            states: {
                                readonly loading: {};
                                readonly loaded: {};
                            };
                        };
                    };
                };
                readonly failedToInitialize: {};
                readonly showingLogEvents: {};
                readonly showingLogCategories: {};
            };
        }> | undefined;
    }) => React.ReactElement<any, any>;
};
