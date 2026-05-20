import type { LogViewAttributes, LogViewReference, LogViewStatus } from '../../common/log_views';
import type { InitializeFromUrl, UpdateContextInUrl, ListenForUrlChanges } from '../observability_logs/log_view_state/src/url_state_storage_service';
import type { ILogViewsClient } from '../services/log_views';
export declare const useLogView: ({ initialLogViewReference, logViews, initializeFromUrl, updateContextInUrl, listenForUrlChanges, }: {
    initialLogViewReference?: LogViewReference;
    logViews: ILogViewsClient;
    initializeFromUrl?: InitializeFromUrl;
    updateContextInUrl?: UpdateContextInUrl;
    listenForUrlChanges?: ListenForUrlChanges;
}) => {
    logViewStateService: import("xstate").Actor<import("xstate").StateMachine<import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), {
        type: "LOG_VIEW_REFERENCE_CHANGED";
        logViewReference: LogViewReference;
    } | {
        type: "INITIALIZED_FROM_URL";
        logViewReference: LogViewReference | null;
    } | {
        type: "LOADING_SUCCEEDED";
        logView: import("../../common/log_views").LogView;
    } | {
        type: "LOADING_FAILED";
        error: Error;
    } | {
        type: "RESOLUTION_SUCCEEDED";
        resolvedLogView: import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView>;
    } | {
        type: "UPDATE";
        attributes: Partial<LogViewAttributes>;
    } | {
        type: "UPDATING_SUCCEEDED";
        logView: import("../../common/log_views").LogView;
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
        logView: import("../../common/log_views").LogView;
    } | {
        type: "RETRY_PERSISTING_INLINE_LOG_VIEW";
    } | {
        type: "LOG_VIEW_URL_KEY_REMOVED";
    } | {
        type: "LOG_VIEW_URL_KEY_CHANGED";
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").CallbackActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
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
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
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
            context: import("../observability_logs/log_view_state").LogViewContext;
            event: import("../observability_logs/log_view_state").LogViewEvent;
        }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView>, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
            index: "empty" | "unknown" | "available" | "missing";
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | undefined;
    }, {
        src: "initializeFromUrl";
        logic: import("xstate").CallbackActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "listenForUrlChanges";
        logic: import("xstate").ObservableActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
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
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
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
            context: import("../observability_logs/log_view_state").LogViewContext;
            event: import("../observability_logs/log_view_state").LogViewEvent;
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
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "resolveLogView";
        logic: import("xstate").PromiseActorLogic<import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView>, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "loadLogViewStatus";
        logic: import("xstate").PromiseActorLogic<{
            index: "empty" | "unknown" | "available" | "missing";
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
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
    }, never, "loading" | "uninitialized" | "resolving" | "updating" | "checkingStatus" | "resolvedPersistedLogView" | "resolvedInlineLogView" | "loadingFailed" | "updatingFailed" | "resolutionFailed" | "checkingStatusFailed" | "initializingFromUrl" | "persistingInlineLogView" | "persistingInlineLogViewFailed", string, import("../observability_logs/log_view_state").LogViewContextWithReference, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    }>>;
    logViewStateNotifications: import("@kbn/xstate-utils").NotificationChannel<import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewNotificationEvent>;
    hasFailedLoading: boolean;
    hasFailedLoadingLogView: boolean;
    hasFailedLoadingLogViewStatus: boolean;
    hasFailedResolvingLogView: boolean;
    latestLoadLogViewFailures: Error[];
    isUninitialized: boolean;
    isLoading: boolean;
    isLoadingLogView: boolean;
    isLoadingLogViewStatus: boolean;
    isResolvingLogView: boolean;
    logViewReference: {
        logViewId: string;
        type: "log-view-reference";
    } | {
        type: "log-view-inline";
        id: string;
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
    };
    logView: ({
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
    }) | undefined;
    resolvedLogView: import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView> | undefined;
    logViewStatus: {
        index: "empty" | "unknown" | "available" | "missing";
    } | undefined;
    derivedDataView: import("@kbn/data-views-plugin/common").DataView | undefined;
    isInlineLogView: boolean;
    isPersistedLogView: boolean;
    load: () => void;
    retry: () => void;
    update: (logViewAttributes: Partial<LogViewAttributes>) => Promise<void>;
    changeLogViewReference: (logViewReference: LogViewReference) => void;
    revertToDefaultLogView: () => void;
};
export declare const LogViewProvider: import("react").FC<import("react").PropsWithChildren<{
    initialLogViewReference?: LogViewReference;
    logViews: ILogViewsClient;
    initializeFromUrl?: InitializeFromUrl;
    updateContextInUrl?: UpdateContextInUrl;
    listenForUrlChanges?: ListenForUrlChanges;
}>>, useLogViewContext: () => {
    logViewStateService: import("xstate").Actor<import("xstate").StateMachine<import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), {
        type: "LOG_VIEW_REFERENCE_CHANGED";
        logViewReference: LogViewReference;
    } | {
        type: "INITIALIZED_FROM_URL";
        logViewReference: LogViewReference | null;
    } | {
        type: "LOADING_SUCCEEDED";
        logView: import("../../common/log_views").LogView;
    } | {
        type: "LOADING_FAILED";
        error: Error;
    } | {
        type: "RESOLUTION_SUCCEEDED";
        resolvedLogView: import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView>;
    } | {
        type: "UPDATE";
        attributes: Partial<LogViewAttributes>;
    } | {
        type: "UPDATING_SUCCEEDED";
        logView: import("../../common/log_views").LogView;
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
        logView: import("../../common/log_views").LogView;
    } | {
        type: "RETRY_PERSISTING_INLINE_LOG_VIEW";
    } | {
        type: "LOG_VIEW_URL_KEY_REMOVED";
    } | {
        type: "LOG_VIEW_URL_KEY_CHANGED";
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").CallbackActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
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
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
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
            context: import("../observability_logs/log_view_state").LogViewContext;
            event: import("../observability_logs/log_view_state").LogViewEvent;
        }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView>, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
            index: "empty" | "unknown" | "available" | "missing";
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>> | undefined;
    }, {
        src: "initializeFromUrl";
        logic: import("xstate").CallbackActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "listenForUrlChanges";
        logic: import("xstate").ObservableActorLogic<import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
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
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
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
            context: import("../observability_logs/log_view_state").LogViewContext;
            event: import("../observability_logs/log_view_state").LogViewEvent;
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
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "resolveLogView";
        logic: import("xstate").PromiseActorLogic<import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView>, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "loadLogViewStatus";
        logic: import("xstate").PromiseActorLogic<{
            index: "empty" | "unknown" | "available" | "missing";
        }, import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("xstate").EventObject>;
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
    }, never, "loading" | "uninitialized" | "resolving" | "updating" | "checkingStatus" | "resolvedPersistedLogView" | "resolvedInlineLogView" | "loadingFailed" | "updatingFailed" | "resolutionFailed" | "checkingStatusFailed" | "initializingFromUrl" | "persistingInlineLogView" | "persistingInlineLogViewFailed", string, import("../observability_logs/log_view_state").LogViewContextWithReference, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    }>>;
    logViewStateNotifications: import("@kbn/xstate-utils").NotificationChannel<import("../observability_logs/log_view_state").LogViewContextWithReference | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithResolvedLogView & import("../observability_logs/log_view_state").LogViewContextWithStatus) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithError) | (import("../observability_logs/log_view_state").LogViewContextWithReference & import("../observability_logs/log_view_state").LogViewContextWithLogView & import("../observability_logs/log_view_state").LogViewContextWithError), import("../observability_logs/log_view_state").LogViewEvent, import("../observability_logs/log_view_state").LogViewNotificationEvent>;
    hasFailedLoading: boolean;
    hasFailedLoadingLogView: boolean;
    hasFailedLoadingLogViewStatus: boolean;
    hasFailedResolvingLogView: boolean;
    latestLoadLogViewFailures: Error[];
    isUninitialized: boolean;
    isLoading: boolean;
    isLoadingLogView: boolean;
    isLoadingLogViewStatus: boolean;
    isResolvingLogView: boolean;
    logViewReference: {
        logViewId: string;
        type: "log-view-reference";
    } | {
        type: "log-view-inline";
        id: string;
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
    };
    logView: ({
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
    }) | undefined;
    resolvedLogView: import("../../common/log_views").ResolvedLogView<import("@kbn/data-views-plugin/common").DataView> | undefined;
    logViewStatus: {
        index: "empty" | "unknown" | "available" | "missing";
    } | undefined;
    derivedDataView: import("@kbn/data-views-plugin/common").DataView | undefined;
    isInlineLogView: boolean;
    isPersistedLogView: boolean;
    load: () => void;
    retry: () => void;
    update: (logViewAttributes: Partial<LogViewAttributes>) => Promise<void>;
    changeLogViewReference: (logViewReference: LogViewReference) => void;
    revertToDefaultLogView: () => void;
};
