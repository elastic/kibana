import type { IToasts } from '@kbn/core/public';
import type { ActorRefFrom } from 'xstate';
import type { DatasetTypesPrivileges, DataStreamDocsStat, DataStreamStat } from '../../../../common/api_types';
import type { Integration } from '../../../../common/data_streams_stats/integration';
import type { DataStreamType } from '../../../../common/types';
import type { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import type { DatasetQualityControllerContext, DatasetQualityControllerEvent } from './types';
export interface DatasetQualityControllerStateMachineDependencies {
    initialContext?: DatasetQualityControllerContext;
    toasts: IToasts;
    dataStreamStatsClient: IDataStreamsStatsClient;
    isDatasetQualityAllSignalsAvailable: boolean;
}
export declare const createDatasetQualityControllerStateMachine: ({ initialContext, toasts, dataStreamStatsClient, isDatasetQualityAllSignalsAvailable, }: DatasetQualityControllerStateMachineDependencies) => import("xstate").StateMachine<import("./types").DefaultDatasetQualityControllerState, {
    type: "UPDATE_TABLE_CRITERIA";
    dataset_criteria: import("../../../../common/types").TableCriteria<import("../../../hooks").DatasetTableSortField>;
} | {
    type: "UPDATE_INSIGHTS_TIME_RANGE";
    timeRange: import("../../../../common/types").TimeRangeConfig;
} | {
    type: "TOGGLE_INACTIVE_DATASETS";
} | {
    type: "TOGGLE_FULL_DATASET_NAMES";
} | {
    type: "UPDATE_TIME_RANGE";
    timeRange: import("../../../../common/types").TimeRangeConfig;
} | {
    type: "REFRESH_DATA";
} | {
    type: "UPDATE_INTEGRATIONS";
    integrations: string[];
} | {
    type: "UPDATE_NAMESPACES";
    namespaces: string[];
} | {
    type: "UPDATE_QUALITIES";
    qualities: import("../../../../common/types").QualityIndicators[];
} | {
    type: "UPDATE_QUERY";
    query: string;
} | {
    type: "UPDATE_TYPES";
    types: DataStreamType[];
} | {
    type: "UPDATE_FAILURE_STORE";
    dataStream: import("../../../../common/data_streams_stats").DataStreamStat;
} | {
    type: "SAVE_TOTAL_DOCS_STATS";
    data: DataStreamDocsStat[];
    dataStreamType: DataStreamType;
} | {
    type: "NOTIFY_TOTAL_DOCS_STATS_FAILED";
    error: Error;
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        datasetTypesPrivileges: DatasetTypesPrivileges;
    }, import("xstate").NonReducibleUnknown, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        datasetUserPrivileges: import("../../../../common/api_types").DatasetUserPrivileges;
        dataStreamsStats: DataStreamStat[];
    }, import("./types").DefaultDatasetQualityControllerState, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").CallbackActorLogic<DatasetQualityControllerEvent, {
        context: DatasetQualityControllerContext;
        type: DataStreamType;
    }, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        dataset: string;
        count: number;
    }[], import("./types").DefaultDatasetQualityControllerState, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        aggregatable: boolean;
        datasets: string[];
    }, import("./types").DefaultDatasetQualityControllerState, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<Integration[], import("xstate").NonReducibleUnknown, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<void, {
        context: DatasetQualityControllerContext;
        event: DatasetQualityControllerEvent;
    }, import("xstate").EventObject>> | undefined;
}, {
    src: "loadDatasetTypesPrivileges";
    logic: import("xstate").PromiseActorLogic<{
        datasetTypesPrivileges: DatasetTypesPrivileges;
    }, import("xstate").NonReducibleUnknown, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadDataStreamStats";
    logic: import("xstate").PromiseActorLogic<{
        datasetUserPrivileges: import("../../../../common/api_types").DatasetUserPrivileges;
        dataStreamsStats: DataStreamStat[];
    }, import("./types").DefaultDatasetQualityControllerState, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadDataStreamDocsStats";
    logic: import("xstate").CallbackActorLogic<DatasetQualityControllerEvent, {
        context: DatasetQualityControllerContext;
        type: DataStreamType;
    }, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadDegradedDocs";
    logic: import("xstate").PromiseActorLogic<{
        dataset: string;
        count: number;
    }[], import("./types").DefaultDatasetQualityControllerState, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadFailedDocs";
    logic: import("xstate").PromiseActorLogic<{
        dataset: string;
        count: number;
    }[], import("./types").DefaultDatasetQualityControllerState, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadNonAggregatableDatasets";
    logic: import("xstate").PromiseActorLogic<{
        aggregatable: boolean;
        datasets: string[];
    }, import("./types").DefaultDatasetQualityControllerState, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "loadIntegrations";
    logic: import("xstate").PromiseActorLogic<Integration[], import("xstate").NonReducibleUnknown, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "updateFailureStore";
    logic: import("xstate").PromiseActorLogic<void, {
        context: DatasetQualityControllerContext;
        event: DatasetQualityControllerEvent;
    }, import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "storeTableOptions";
    params: unknown;
} | {
    type: "resetPage";
    params: unknown;
} | {
    type: "storeInactiveDatasetsVisibility";
    params: unknown;
} | {
    type: "storeFullDatasetNamesVisibility";
    params: unknown;
} | {
    type: "storeTimeRange";
    params: unknown;
} | {
    type: "storeIntegrationsFilter";
    params: unknown;
} | {
    type: "storeNamespaces";
    params: unknown;
} | {
    type: "storeQualities";
    params: unknown;
} | {
    type: "storeTypes";
    params: unknown;
} | {
    type: "storeQuery";
    params: unknown;
} | {
    type: "storeDatasets";
    params: unknown;
} | {
    type: "storeEmptyIntegrations";
    params: unknown;
} | {
    type: "storeAuthorizedDatasetTypes";
    params: unknown;
} | {
    type: "storeDataStreamStats";
    params: unknown;
} | {
    type: "storeTotalDocStats";
    params: unknown;
} | {
    type: "storeDegradedDocStats";
    params: unknown;
} | {
    type: "storeFailedDocStats";
    params: unknown;
} | {
    type: "storeNonAggregatableDatasets";
    params: unknown;
} | {
    type: "storeIntegrations";
    params: unknown;
} | {
    type: "resetLoadedTotalDocsTypes";
    params: unknown;
} | {
    type: "notifyFetchDatasetTypesPrivilegesFailed";
    params: unknown;
} | {
    type: "notifyFetchDatasetStatsFailed";
    params: unknown;
} | {
    type: "notifyFetchDegradedStatsFailed";
    params: unknown;
} | {
    type: "notifyFetchNonAggregatableDatasetsFailed";
    params: unknown;
} | {
    type: "notifyFetchIntegrationsFailed";
    params: unknown;
} | {
    type: "notifyFetchTotalDocsFailed";
    params: unknown;
} | {
    type: "notifyFetchFailedStatsFailed";
    params: unknown;
} | {
    type: "notifyUpdateFailureStoreSuccess";
    params: unknown;
} | {
    type: "notifyUpdateFailureStoreFailed";
    params: unknown;
}, {
    type: "hasAuthorizedTypes";
    params: unknown;
} | {
    type: "checkIfActionForbidden";
    params: unknown;
} | {
    type: "checkIfNotImplemented";
    params: unknown;
} | {
    type: "allTotalDocsTypesLoaded";
    params: unknown;
}, never, "initializing" | "emptyState" | "initializationFailed" | {
    main: {
        integrations: "fetching" | "loaded";
        stats: {
            degradedDocs: "fetching" | "loaded" | "unauthorized";
            failedDocs: "fetching" | "loaded" | "unauthorized" | "notImplemented";
            datasets: "fetching" | "loaded";
            nonAggregatableDatasets: "fetching" | "loaded" | "unauthorized";
            docsStats: "fetching" | "loaded" | "unauthorized";
        };
        failureStoreUpdate: "idle" | "updating";
    };
}, string, import("xstate").NonReducibleUnknown, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "DatasetQualityController";
    states: {
        readonly initializing: {};
        readonly initializationFailed: {};
        readonly emptyState: {};
        readonly main: {
            states: {
                readonly stats: {
                    states: {
                        readonly datasets: {
                            states: {
                                readonly fetching: {};
                                readonly loaded: {};
                            };
                        };
                        readonly degradedDocs: {
                            states: {
                                readonly fetching: {};
                                readonly loaded: {};
                                readonly unauthorized: {};
                            };
                        };
                        readonly failedDocs: {
                            states: {
                                readonly fetching: {};
                                readonly loaded: {};
                                readonly notImplemented: {};
                                readonly unauthorized: {};
                            };
                        };
                        readonly docsStats: {
                            states: {
                                readonly fetching: {};
                                readonly loaded: {};
                                readonly unauthorized: {};
                            };
                        };
                        readonly nonAggregatableDatasets: {
                            states: {
                                readonly fetching: {};
                                readonly loaded: {};
                                readonly unauthorized: {};
                            };
                        };
                    };
                };
                readonly integrations: {
                    states: {
                        readonly fetching: {};
                        readonly loaded: {};
                    };
                };
                readonly failureStoreUpdate: {
                    states: {
                        readonly idle: {};
                        readonly updating: {};
                    };
                };
            };
        };
    };
}>;
export type DatasetQualityControllerStateService = ActorRefFrom<ReturnType<typeof createDatasetQualityControllerStateMachine>>;
