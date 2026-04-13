import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import type { SampleDocument, Streams } from '@kbn/streams-schema';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimefilterHook } from '@kbn/data-plugin/public/query/timefilter/use_timefilter';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Condition } from '@kbn/streamlang';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
export interface RoutingSamplesMachineDeps {
    data: DataPublicPluginStart;
    timeState$: TimefilterHook['timeState$'];
    telemetryClient: StreamsTelemetryClient;
}
export type RoutingSamplesActorRef = ActorRefFrom<typeof routingSamplesMachine>;
export type RoutingSamplesActorSnapshot = SnapshotFrom<typeof routingSamplesMachine>;
export type DocumentMatchFilterOptions = 'matched' | 'unmatched';
export interface RoutingSamplesInput {
    condition?: Condition;
    definition: Streams.WiredStream.GetResponse;
    documentMatchFilter: DocumentMatchFilterOptions;
}
export interface RoutingSamplesContext {
    condition?: Condition;
    definition: Streams.WiredStream.GetResponse;
    documents: SampleDocument[];
    documentsError?: Error;
    approximateMatchingPercentage?: number | null;
    approximateMatchingPercentageError?: Error;
    documentMatchFilter: DocumentMatchFilterOptions;
    selectedPreview?: {
        type: 'suggestion';
        name: string;
        index: number;
    } | {
        type: 'createStream';
    } | {
        type: 'updateStream';
        name: string;
    };
}
export type RoutingSamplesEvent = {
    type: 'routingSamples.refresh';
} | {
    type: 'routingSamples.updateCondition';
    condition?: Condition;
} | {
    type: 'routingSamples.setDocumentMatchFilter';
    filter: DocumentMatchFilterOptions;
} | {
    type: 'routingSamples.setSelectedPreview';
    preview: RoutingSamplesContext['selectedPreview'];
    condition: Condition;
} | {
    type: 'routingSamples.updatePreviewName';
    name: string;
};
export interface SearchParams extends RoutingSamplesInput {
    start: number;
    end: number;
}
export interface CollectorParams {
    data: DataPublicPluginStart;
    input: RoutingSamplesInput;
    telemetryClient?: StreamsTelemetryClient;
}
export declare const routingSamplesMachine: import("xstate").StateMachine<RoutingSamplesContext, {
    type: "routingSamples.refresh";
} | {
    type: "routingSamples.updateCondition";
    condition?: Condition;
} | {
    type: "routingSamples.setDocumentMatchFilter";
    filter: DocumentMatchFilterOptions;
} | {
    type: "routingSamples.setSelectedPreview";
    preview: RoutingSamplesContext["selectedPreview"];
    condition: Condition;
} | {
    type: "routingSamples.updatePreviewName";
    name: string;
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<number | null | undefined, Pick<SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<{
        type: string;
    }, import("xstate").NonReducibleUnknown, import("xstate").EventObject>> | undefined;
}, {
    src: "collectDocuments";
    logic: import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "collectDocumentsCount";
    logic: import("xstate").ObservableActorLogic<number | null | undefined, Pick<SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "subscribeTimeUpdates";
    logic: import("xstate").ObservableActorLogic<{
        type: string;
    }, import("xstate").NonReducibleUnknown, import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "updateCondition";
    params: {
        condition?: Condition;
    };
} | {
    type: "storeDocuments";
    params: {
        documents: SampleDocument[];
    };
} | {
    type: "storeDocumentsError";
    params: {
        error: Error | undefined;
    };
} | {
    type: "storeDocumentCounts";
    params: {
        count?: number | null;
    };
} | {
    type: "storeDocumentCountsError";
    params: {
        error: Error;
    };
} | {
    type: "setDocumentMatchFilter";
    params: {
        filter: DocumentMatchFilterOptions;
    };
} | {
    type: "setSelectedPreview";
    params: {
        preview: RoutingSamplesContext["selectedPreview"];
    };
} | {
    type: "updatePreviewName";
    params: {
        name: string;
    };
}, {
    type: "isValidSnapshot";
    params: {
        context?: SampleDocument[] | number | null;
    };
}, "conditionUpdateDebounceTime", "debouncingCondition" | {
    fetching: {
        documents: "done" | "loading";
        documentCounts: "done" | "loading";
    };
}, string, RoutingSamplesInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "routingSamples";
    states: {
        readonly debouncingCondition: {};
        readonly fetching: {
            states: {
                readonly documents: {
                    states: {
                        readonly loading: {};
                        readonly done: {};
                    };
                };
                readonly documentCounts: {
                    states: {
                        readonly loading: {};
                        readonly done: {};
                    };
                };
            };
        };
    };
}>;
export declare const createRoutingSamplesMachineImplementations: ({ data, timeState$, telemetryClient, }: RoutingSamplesMachineDeps) => MachineImplementationsFrom<typeof routingSamplesMachine>;
export declare function createDocumentsCollectorActor({ data, telemetryClient, }: Pick<RoutingSamplesMachineDeps, 'data' | 'telemetryClient'>): import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
export declare function createDocumentsCountCollectorActor({ data, }: Pick<RoutingSamplesMachineDeps, 'data'>): import("xstate").ObservableActorLogic<number | null | undefined, Pick<SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
export declare function buildDocumentCountSearchParams({ start, end, definition, }: Pick<SearchParams, 'start' | 'end' | 'definition'>): {
    index: string;
    query: {
        range: {
            '@timestamp': {
                gte: number;
                lte: number;
                format: string;
            };
        };
    };
    size: number;
    track_total_hits: boolean;
};
export declare function buildDocumentCountProbabilitySearchParams({ condition, definition, docCount, end, start, }: Pick<SearchParams, 'condition' | 'start' | 'end' | 'definition'> & {
    docCount?: number;
}): {
    index: string;
    query: {
        range: {
            '@timestamp': {
                gte: number;
                lte: number;
                format: string;
            };
        };
    };
    aggs: {
        sample: {
            random_sampler: {
                probability: number;
            };
            aggs: {
                matching_docs: {
                    filter: any;
                };
            };
        };
    };
    runtime_mappings: MappingRuntimeFields;
    size: number;
    _source: boolean;
    track_total_hits: boolean;
};
