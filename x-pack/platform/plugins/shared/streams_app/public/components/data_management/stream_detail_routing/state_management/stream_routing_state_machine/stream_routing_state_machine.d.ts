import type { MachineImplementationsFrom, ActorRefFrom } from 'xstate';
import type { Streams } from '@kbn/streams-schema';
import type { RoutingDefinition } from '@kbn/streams-schema';
import type { StreamRoutingContext, StreamRoutingInput, StreamRoutingServiceDependencies } from './types';
import type { RoutingDefinitionWithUIAttributes } from '../../types';
import type { PartitionSuggestion } from '../../review_suggestions_form/use_review_suggestions_form';
export type StreamRoutingActorRef = ActorRefFrom<typeof streamRoutingMachine>;
export declare const streamRoutingMachine: import("xstate").StateMachine<StreamRoutingContext, {
    type: "childStreams.mode.changeToIngestMode";
} | {
    type: "childStreams.mode.changeToQueryMode";
} | {
    type: "queryStream.create";
} | {
    type: "queryStream.cancel";
} | {
    type: "queryStream.save";
    name: string;
    esqlQuery: string;
} | {
    type: "routingRule.cancel";
} | {
    type: "routingRule.change";
    routingRule: Partial<RoutingDefinitionWithUIAttributes>;
} | {
    type: "routingRule.create";
} | {
    type: "routingRule.edit";
    id: string;
} | {
    type: "routingRule.fork";
    routingRule?: RoutingDefinition;
} | {
    type: "routingRule.reorder";
    routing: RoutingDefinitionWithUIAttributes[];
} | {
    type: "routingRule.remove";
} | {
    type: "routingRule.save";
} | {
    type: "routingRule.setConditionEditorValidity";
    isValid: boolean;
} | {
    type: "routingSamples.setDocumentMatchFilter";
    filter: import("./routing_samples_state_machine").DocumentMatchFilterOptions;
} | {
    type: "routingSamples.setSelectedPreview";
    preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
} | {
    type: "suggestion.preview";
    condition: import("@kbn/streamlang").Condition;
    name: string;
    index: number;
    toggle?: boolean;
} | {
    type: "routingRule.reviewSuggested";
    id: string;
} | {
    type: "stream.received";
    definition: Streams.WiredStream.GetResponse;
} | {
    type: "suggestion.edit";
    index: number;
    suggestion: PartitionSuggestion;
} | {
    type: "suggestion.changeName";
    name: string;
} | {
    type: "suggestion.changeCondition";
    condition: import("@kbn/streamlang").Condition;
} | {
    type: "suggestion.saveSuggestion";
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        acknowledged: true;
    }, import("./stream_actors").DeleteStreamInput, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<{
        acknowledged: true;
    }, import("./stream_actors").ForkStreamInput, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, import("./stream_actors").UpsertStreamInput, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("./routing_samples_state_machine").RoutingSamplesContext, {
        type: "routingSamples.refresh";
    } | {
        type: "routingSamples.updateCondition";
        condition?: import("@kbn/streamlang").Condition;
    } | {
        type: "routingSamples.setDocumentMatchFilter";
        filter: import("./routing_samples_state_machine").DocumentMatchFilterOptions;
    } | {
        type: "routingSamples.setSelectedPreview";
        preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
        condition: import("@kbn/streamlang").Condition;
    } | {
        type: "routingSamples.updatePreviewName";
        name: string;
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<number | null | undefined, Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<{
            type: string;
        }, import("xstate").NonReducibleUnknown, import("xstate").EventObject>> | undefined;
    }, {
        src: "collectDocuments";
        logic: import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "collectDocumentsCount";
        logic: import("xstate").ObservableActorLogic<number | null | undefined, Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
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
            condition?: import("@kbn/streamlang").Condition;
        };
    } | {
        type: "storeDocuments";
        params: {
            documents: import("@kbn/streams-schema").SampleDocument[];
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
            filter: import("./routing_samples_state_machine").DocumentMatchFilterOptions;
        };
    } | {
        type: "setSelectedPreview";
        params: {
            preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
        };
    } | {
        type: "updatePreviewName";
        params: {
            name: string;
        };
    }, {
        type: "isValidSnapshot";
        params: {
            context?: import("@kbn/streams-schema").SampleDocument[] | number | null;
        };
    }, "conditionUpdateDebounceTime", "debouncingCondition" | {
        fetching: {
            documents: "done" | "loading";
            documentCounts: "done" | "loading";
        };
    }, string, import("./routing_samples_state_machine").RoutingSamplesInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    }>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, import("./stream_actors").CreateQueryStreamInput, import("xstate").EventObject>> | undefined;
}, {
    src: "deleteStream";
    logic: import("xstate").PromiseActorLogic<{
        acknowledged: true;
    }, import("./stream_actors").DeleteStreamInput, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "forkStream";
    logic: import("xstate").PromiseActorLogic<{
        acknowledged: true;
    }, import("./stream_actors").ForkStreamInput, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "upsertStream";
    logic: import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, import("./stream_actors").UpsertStreamInput, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "routingSamplesMachine";
    logic: import("xstate").StateMachine<import("./routing_samples_state_machine").RoutingSamplesContext, {
        type: "routingSamples.refresh";
    } | {
        type: "routingSamples.updateCondition";
        condition?: import("@kbn/streamlang").Condition;
    } | {
        type: "routingSamples.setDocumentMatchFilter";
        filter: import("./routing_samples_state_machine").DocumentMatchFilterOptions;
    } | {
        type: "routingSamples.setSelectedPreview";
        preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
        condition: import("@kbn/streamlang").Condition;
    } | {
        type: "routingSamples.updatePreviewName";
        name: string;
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<number | null | undefined, Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<{
            type: string;
        }, import("xstate").NonReducibleUnknown, import("xstate").EventObject>> | undefined;
    }, {
        src: "collectDocuments";
        logic: import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "collectDocumentsCount";
        logic: import("xstate").ObservableActorLogic<number | null | undefined, Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>;
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
            condition?: import("@kbn/streamlang").Condition;
        };
    } | {
        type: "storeDocuments";
        params: {
            documents: import("@kbn/streams-schema").SampleDocument[];
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
            filter: import("./routing_samples_state_machine").DocumentMatchFilterOptions;
        };
    } | {
        type: "setSelectedPreview";
        params: {
            preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
        };
    } | {
        type: "updatePreviewName";
        params: {
            name: string;
        };
    }, {
        type: "isValidSnapshot";
        params: {
            context?: import("@kbn/streams-schema").SampleDocument[] | number | null;
        };
    }, "conditionUpdateDebounceTime", "debouncingCondition" | {
        fetching: {
            documents: "done" | "loading";
            documentCounts: "done" | "loading";
        };
    }, string, import("./routing_samples_state_machine").RoutingSamplesInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    id: string | undefined;
} | {
    src: "createQueryStream";
    logic: import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, import("./stream_actors").CreateQueryStreamInput, import("xstate").EventObject>;
    id: string | undefined;
}, {
    type: "refreshDefinition";
    params: unknown;
} | {
    type: "notifyStreamSuccess";
    params: unknown;
} | {
    type: "notifyStreamFailure";
    params: unknown;
} | {
    type: "addNewRoutingRule";
    params: unknown;
} | {
    type: "appendRoutingRules";
    params: {
        definitions: RoutingDefinition[];
    };
} | {
    type: "patchRule";
    params: {
        routingRule: Partial<RoutingDefinitionWithUIAttributes>;
    };
} | {
    type: "reorderRouting";
    params: {
        routing: RoutingDefinitionWithUIAttributes[];
    };
} | {
    type: "resetRoutingChanges";
    params: unknown;
} | {
    type: "setupRouting";
    params: {
        definition: Streams.WiredStream.GetResponse;
    };
} | {
    type: "storeCurrentRuleId";
    params: {
        id: StreamRoutingContext["currentRuleId"];
    };
} | {
    type: "storeDefinition";
    params: {
        definition: Streams.WiredStream.GetResponse;
    };
} | {
    type: "storeSuggestedRuleId";
    params: {
        id: StreamRoutingContext["suggestedRuleId"];
    };
} | {
    type: "resetSuggestedRuleId";
    params: unknown;
} | {
    type: "storeEditingSuggestion";
    params: {
        index: number;
        suggestion: PartitionSuggestion;
    };
} | {
    type: "updateEditedSuggestion";
    params: {
        updates: Partial<PartitionSuggestion>;
    };
} | {
    type: "clearEditingSuggestion";
    params: unknown;
} | {
    type: "setRefreshing";
    params: unknown;
} | {
    type: "clearRefreshing";
    params: unknown;
} | {
    type: "setConditionEditorValidity";
    params: {
        isValid: boolean;
    };
} | {
    type: "notifyQueryStreamSuccess";
    params: unknown;
}, {
    type: "canForkStream";
    params: unknown;
} | {
    type: "canReorderRules";
    params: unknown;
} | {
    type: "canUpdateStream";
    params: unknown;
} | {
    type: "canSaveSuggestion";
    params: unknown;
} | {
    type: "hasMultipleRoutingRules";
    params: unknown;
} | {
    type: "hasManagePrivileges";
    params: unknown;
} | {
    type: "hasSimulatePrivileges";
    params: unknown;
} | {
    type: "isAlreadyEditing";
    params: {
        id: string;
    };
} | {
    type: "isConditionEditorValid";
    params: unknown;
} | {
    type: "isValidRouting";
    params: unknown;
} | {
    type: "hasRoutingChanges";
    params: unknown;
} | {
    type: "isValidEditedSuggestion";
    params: unknown;
} | {
    type: "isValidChild";
    params: unknown;
}, never, "initializing" | {
    ready: {
        ingestMode: "idle" | {
            creatingNewRule: "changing" | "forking";
        } | {
            editingRule: "changing" | "removingRule" | "updatingRule";
        } | {
            reorderingRules: "reordering" | "updatingStream";
        } | {
            reviewSuggestedRule: "forking" | "reviewing";
        } | {
            editingSuggestedRule: "editing";
        };
    } | {
        queryMode: "idle" | {
            creating: "changing" | "saving";
        };
    };
}, string, StreamRoutingInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "routingStream";
    states: {
        readonly initializing: {};
        readonly ready: {
            id: "ready";
            states: {
                readonly ingestMode: {
                    id: "ingestMode";
                    states: {
                        readonly idle: {
                            id: "idle";
                        };
                        readonly creatingNewRule: {
                            id: "creatingNewRule";
                            states: {
                                readonly changing: {};
                                readonly forking: {};
                            };
                        };
                        readonly editingRule: {
                            id: "editingRule";
                            states: {
                                readonly changing: {};
                                readonly removingRule: {};
                                readonly updatingRule: {};
                            };
                        };
                        readonly reorderingRules: {
                            id: "reorderingRules";
                            states: {
                                readonly reordering: {};
                                readonly updatingStream: {};
                            };
                        };
                        readonly reviewSuggestedRule: {
                            id: "reviewSuggestedRule";
                            states: {
                                readonly reviewing: {};
                                readonly forking: {};
                            };
                        };
                        readonly editingSuggestedRule: {
                            id: "editingSuggestedRule";
                            states: {
                                readonly editing: {};
                            };
                        };
                    };
                };
                readonly queryMode: {
                    id: "queryMode";
                    states: {
                        readonly idle: {};
                        readonly creating: {
                            states: {
                                readonly changing: {};
                                readonly saving: {};
                            };
                        };
                    };
                };
            };
        };
    };
}>;
export declare const createStreamRoutingMachineImplementations: ({ refreshDefinition, streamsRepositoryClient, core, data, timeState$, forkSuccessNofitier, telemetryClient, }: StreamRoutingServiceDependencies) => MachineImplementationsFrom<typeof streamRoutingMachine>;
