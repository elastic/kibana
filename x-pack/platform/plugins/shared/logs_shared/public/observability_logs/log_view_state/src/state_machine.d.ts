import type { DataView } from '@kbn/data-views-plugin/common';
import type { NotificationChannel } from '@kbn/xstate-utils';
import type { LogView, LogViewStatus, ResolvedLogView } from '../../../../common/log_views';
import type { ILogViewsClient } from '../../../services/log_views';
import type { LogViewNotificationEvent } from './notifications';
import type { LogViewContext, LogViewContextWithError, LogViewContextWithLogView, LogViewContextWithReference, LogViewContextWithResolvedLogView, LogViewContextWithStatus, LogViewEvent } from './types';
import type { InitializeFromUrl, UpdateContextInUrl, ListenForUrlChanges } from './url_state_storage_service';
export declare const logViewStateMachine: import("xstate").StateMachine<LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), {
    type: "LOG_VIEW_REFERENCE_CHANGED";
    logViewReference: import("../../../../common/log_views").LogViewReference;
} | {
    type: "INITIALIZED_FROM_URL";
    logViewReference: import("../../../../common/log_views").LogViewReference | null;
} | {
    type: "LOADING_SUCCEEDED";
    logView: LogView;
} | {
    type: "LOADING_FAILED";
    error: Error;
} | {
    type: "RESOLUTION_SUCCEEDED";
    resolvedLogView: ResolvedLogView<DataView>;
} | {
    type: "UPDATE";
    attributes: Partial<import("../../../../common/log_views").LogViewAttributes>;
} | {
    type: "UPDATING_SUCCEEDED";
    logView: LogView;
} | {
    type: "UPDATING_FAILED";
    error: Error;
} | {
    type: "RESOLUTION_FAILED";
    error: Error;
} | {
    type: "CHECKING_STATUS_SUCCEEDED";
    status: LogViewStatus;
} | {
    type: "CHECKING_STATUS_FAILED";
    error: Error;
} | {
    type: "RETRY";
} | {
    type: "RELOAD_LOG_VIEW";
} | {
    type: "PERSIST_INLINE_LOG_VIEW";
} | {
    type: "PERSISTING_INLINE_LOG_VIEW_FAILED";
    error: Error;
} | {
    type: "PERSISTING_INLINE_LOG_VIEW_SUCCEEDED";
    logView: LogView;
} | {
    type: "RETRY_PERSISTING_INLINE_LOG_VIEW";
} | {
    type: "LOG_VIEW_URL_KEY_REMOVED";
} | {
    type: "LOG_VIEW_URL_KEY_CHANGED";
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").CallbackActorLogic<LogViewEvent, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<LogViewEvent, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        id: string;
        origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
        attributes: {
            name: string;
            description: string;
            logIndices: {
                type: "data_view";
                dataViewId: string;
            } | {
                type: "index_name";
                indexName: string;
            } | {
                type: "kibana_advanced_setting";
            };
            logColumns: ({
                timestampColumn: {
                    id: string;
                };
            } | {
                messageColumn: {
                    id: string;
                };
            } | {
                fieldColumn: {
                    id: string;
                } & {
                    field: string;
                };
            })[];
        };
    } & {
        updatedAt?: number | undefined;
        version?: string | undefined;
    }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        id: string;
        origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
        attributes: {
            name: string;
            description: string;
            logIndices: {
                type: "data_view";
                dataViewId: string;
            } | {
                type: "index_name";
                indexName: string;
            } | {
                type: "kibana_advanced_setting";
            };
            logColumns: ({
                timestampColumn: {
                    id: string;
                };
            } | {
                messageColumn: {
                    id: string;
                };
            } | {
                fieldColumn: {
                    id: string;
                } & {
                    field: string;
                };
            })[];
        };
    } & {
        updatedAt?: number | undefined;
        version?: string | undefined;
    }, {
        context: LogViewContext;
        event: LogViewEvent;
    }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<ResolvedLogView<DataView>, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        index: "empty" | "unknown" | "available" | "missing";
    }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>> | undefined;
}, {
    src: "initializeFromUrl";
    logic: import("xstate").CallbackActorLogic<LogViewEvent, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "listenForUrlChanges";
    logic: import("xstate").ObservableActorLogic<LogViewEvent, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadLogView";
    logic: import("xstate").PromiseActorLogic<{
        id: string;
        origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
        attributes: {
            name: string;
            description: string;
            logIndices: {
                type: "data_view";
                dataViewId: string;
            } | {
                type: "index_name";
                indexName: string;
            } | {
                type: "kibana_advanced_setting";
            };
            logColumns: ({
                timestampColumn: {
                    id: string;
                };
            } | {
                messageColumn: {
                    id: string;
                };
            } | {
                fieldColumn: {
                    id: string;
                } & {
                    field: string;
                };
            })[];
        };
    } & {
        updatedAt?: number | undefined;
        version?: string | undefined;
    }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "updateLogView";
    logic: import("xstate").PromiseActorLogic<{
        id: string;
        origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
        attributes: {
            name: string;
            description: string;
            logIndices: {
                type: "data_view";
                dataViewId: string;
            } | {
                type: "index_name";
                indexName: string;
            } | {
                type: "kibana_advanced_setting";
            };
            logColumns: ({
                timestampColumn: {
                    id: string;
                };
            } | {
                messageColumn: {
                    id: string;
                };
            } | {
                fieldColumn: {
                    id: string;
                } & {
                    field: string;
                };
            })[];
        };
    } & {
        updatedAt?: number | undefined;
        version?: string | undefined;
    }, {
        context: LogViewContext;
        event: LogViewEvent;
    }, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "persistInlineLogView";
    logic: import("xstate").PromiseActorLogic<{
        id: string;
        origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
        attributes: {
            name: string;
            description: string;
            logIndices: {
                type: "data_view";
                dataViewId: string;
            } | {
                type: "index_name";
                indexName: string;
            } | {
                type: "kibana_advanced_setting";
            };
            logColumns: ({
                timestampColumn: {
                    id: string;
                };
            } | {
                messageColumn: {
                    id: string;
                };
            } | {
                fieldColumn: {
                    id: string;
                } & {
                    field: string;
                };
            })[];
        };
    } & {
        updatedAt?: number | undefined;
        version?: string | undefined;
    }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "resolveLogView";
    logic: import("xstate").PromiseActorLogic<ResolvedLogView<DataView>, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadLogViewStatus";
    logic: import("xstate").PromiseActorLogic<{
        index: "empty" | "unknown" | "available" | "missing";
    }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "storeError";
    params: unknown;
} | {
    type: "notifyLoadingStarted";
    params: unknown;
} | {
    type: "notifyLoadingSucceeded";
    params: unknown;
} | {
    type: "notifyLoadingFailed";
    params: unknown;
} | {
    type: "notifyPersistingInlineLogViewFailed";
    params: unknown;
} | {
    type: "updateContextInUrl";
    params: unknown;
} | {
    type: "storeLogViewReference";
    params: unknown;
} | {
    type: "storeLogView";
    params: unknown;
} | {
    type: "storeResolvedLogView";
    params: unknown;
} | {
    type: "storeStatus";
    params: unknown;
} | {
    type: "convertInlineLogViewReferenceToPersistedLogViewReference";
    params: unknown;
} | {
    type: "updateLogViewReference";
    params: unknown;
}, {
    type: "isPersistedLogView";
    params: unknown;
}, never, "loading" | "uninitialized" | "resolving" | "updating" | "checkingStatus" | "resolvedPersistedLogView" | "resolvedInlineLogView" | "loadingFailed" | "updatingFailed" | "resolutionFailed" | "checkingStatusFailed" | "initializingFromUrl" | "persistingInlineLogView" | "persistingInlineLogViewFailed", string, LogViewContextWithReference, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "LogView";
    states: {
        readonly uninitialized: {};
        readonly initializingFromUrl: {};
        readonly loading: {};
        readonly resolving: {};
        readonly checkingStatus: {};
        readonly resolvedPersistedLogView: {};
        readonly resolvedInlineLogView: {};
        readonly persistingInlineLogView: {};
        readonly persistingInlineLogViewFailed: {};
        readonly loadingFailed: {};
        readonly resolutionFailed: {};
        readonly checkingStatusFailed: {};
        readonly updating: {};
        readonly updatingFailed: {};
    };
}>;
export interface LogViewStateMachineImplementationDependencies {
    logViews: ILogViewsClient;
    notificationChannel?: NotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>;
    initializeFromUrl?: InitializeFromUrl;
    updateContextInUrl?: UpdateContextInUrl;
    listenForUrlChanges?: ListenForUrlChanges;
}
export declare const createLogViewStateMachineImplementations: ({ logViews, notificationChannel, initializeFromUrl, updateContextInUrl, listenForUrlChanges, }: LogViewStateMachineImplementationDependencies) => {
    actions: {
        updateContextInUrl?: (({ context }: {
            context: LogViewContext;
            event: LogViewEvent;
        }) => void) | undefined;
        notifyLoadingStarted?: ((args: {
            context: LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError);
            event: LogViewEvent;
        }) => void) | undefined;
        notifyLoadingSucceeded?: ((args: {
            context: LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError);
            event: LogViewEvent;
        }) => void) | undefined;
        notifyLoadingFailed?: ((args: {
            context: LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError);
            event: LogViewEvent;
        }) => void) | undefined;
    };
    actors: {
        loadLogView: import("xstate").PromiseActorLogic<{
            id: string;
            origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
            attributes: {
                name: string;
                description: string;
                logIndices: {
                    type: "data_view";
                    dataViewId: string;
                } | {
                    type: "index_name";
                    indexName: string;
                } | {
                    type: "kibana_advanced_setting";
                };
                logColumns: ({
                    timestampColumn: {
                        id: string;
                    };
                } | {
                    messageColumn: {
                        id: string;
                    };
                } | {
                    fieldColumn: {
                        id: string;
                    } & {
                        field: string;
                    };
                })[];
            };
        } & {
            updatedAt?: number | undefined;
            version?: string | undefined;
        }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
        updateLogView: import("xstate").PromiseActorLogic<{
            id: string;
            origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
            attributes: {
                name: string;
                description: string;
                logIndices: {
                    type: "data_view";
                    dataViewId: string;
                } | {
                    type: "index_name";
                    indexName: string;
                } | {
                    type: "kibana_advanced_setting";
                };
                logColumns: ({
                    timestampColumn: {
                        id: string;
                    };
                } | {
                    messageColumn: {
                        id: string;
                    };
                } | {
                    fieldColumn: {
                        id: string;
                    } & {
                        field: string;
                    };
                })[];
            };
        } & {
            updatedAt?: number | undefined;
            version?: string | undefined;
        }, {
            context: LogViewContext;
            event: LogViewEvent;
        }, import("xstate").EventObject>;
        persistInlineLogView: import("xstate").PromiseActorLogic<{
            id: string;
            origin: "inline" | "internal" | "stored" | "infra-source-stored" | "infra-source-internal" | "infra-source-fallback";
            attributes: {
                name: string;
                description: string;
                logIndices: {
                    type: "data_view";
                    dataViewId: string;
                } | {
                    type: "index_name";
                    indexName: string;
                } | {
                    type: "kibana_advanced_setting";
                };
                logColumns: ({
                    timestampColumn: {
                        id: string;
                    };
                } | {
                    messageColumn: {
                        id: string;
                    };
                } | {
                    fieldColumn: {
                        id: string;
                    } & {
                        field: string;
                    };
                })[];
            };
        } & {
            updatedAt?: number | undefined;
            version?: string | undefined;
        }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
        resolveLogView: import("xstate").PromiseActorLogic<ResolvedLogView<DataView>, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
        loadLogViewStatus: import("xstate").PromiseActorLogic<{
            index: "empty" | "unknown" | "available" | "missing";
        }, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject>;
        listenForUrlChanges?: import("xstate").ObservableActorLogic<LogViewEvent, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject> | undefined;
        initializeFromUrl?: import("xstate").CallbackActorLogic<LogViewEvent, LogViewContextWithReference | (LogViewContextWithReference & LogViewContextWithLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithResolvedLogView & LogViewContextWithStatus) | (LogViewContextWithReference & LogViewContextWithError) | (LogViewContextWithReference & LogViewContextWithLogView & LogViewContextWithError), import("xstate").EventObject> | undefined;
    };
};
