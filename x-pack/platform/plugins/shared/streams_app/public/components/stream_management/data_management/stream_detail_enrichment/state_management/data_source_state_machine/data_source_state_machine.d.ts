import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import type { SampleDocument } from '@kbn/streams-schema';
import { useSelector } from '@xstate/react';
import type { DataSourceInput, DataSourceContext, DataSourceMachineDeps, DataSourceToParentEvent } from './types';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';
export type DataSourceActorRef = ActorRefFrom<typeof dataSourceMachine>;
export type DataSourceActorSnapshot = SnapshotFrom<typeof dataSourceMachine>;
export declare const useDataSourceSelector: typeof useSelector;
export declare const dataSourceMachine: import("xstate").StateMachine<DataSourceContext, {
    type: "dataSource.change";
    dataSource: EnrichmentDataSourceWithUIAttributes;
} | {
    type: "dataSource.delete";
} | {
    type: "dataSource.refresh";
} | {
    type: "dataSource.enable";
} | {
    type: "dataSource.disable";
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], import("./data_collector_actor").SamplesFetchInput, import("xstate").EventObject>> | undefined;
}, {
    src: "collectData";
    logic: import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], import("./data_collector_actor").SamplesFetchInput, import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "notifyDataCollectionFailure";
    params: unknown;
} | {
    type: "restorePersistedCustomSamplesDocuments";
    params: unknown;
} | {
    type: "updatePersistedCustomSamplesDocuments";
    params: unknown;
} | {
    type: "removePersistedCustomSamplesDocuments";
    params: unknown;
} | {
    type: "storeDataSource";
    params: {
        dataSource: EnrichmentDataSourceWithUIAttributes;
    };
} | {
    type: "storeData";
    params: {
        data: SampleDocument[];
    };
} | {
    type: "toggleDataSourceActivity";
    params: unknown;
} | {
    type: "notifyParent";
    params: {
        eventType: DataSourceToParentEvent["type"];
    };
}, {
    type: "isEnabled";
    params: unknown;
} | {
    type: "isValidData";
    params: {
        data?: SampleDocument[];
    };
} | {
    type: "isCustomSamples";
    params: unknown;
} | {
    type: "shouldCollectData";
    params: unknown;
}, "customSamplesDebounce", "disabled" | "deleted" | "determining" | {
    enabled: "idle" | "loadingData" | "debouncingChange";
}, string, DataSourceInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "dataSource";
    states: {
        readonly determining: {};
        readonly enabled: {
            states: {
                readonly idle: {};
                readonly debouncingChange: {};
                readonly loadingData: {};
            };
        };
        readonly disabled: {};
        readonly deleted: {
            id: "deleted";
        };
    };
}>;
export declare const createDataSourceMachineImplementations: ({ data, toasts, telemetryClient, streamsRepositoryClient, }: DataSourceMachineDeps) => MachineImplementationsFrom<typeof dataSourceMachine>;
