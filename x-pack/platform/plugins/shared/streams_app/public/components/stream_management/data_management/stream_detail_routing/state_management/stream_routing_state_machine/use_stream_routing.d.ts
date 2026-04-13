import type { Condition } from '@kbn/streamlang';
import type { RoutingDefinition } from '@kbn/streams-schema';
import React from 'react';
import type { PartitionSuggestion } from '../../review_suggestions_form/use_review_suggestions_form';
import type { RoutingDefinitionWithUIAttributes } from '../../types';
import type { DocumentMatchFilterOptions, RoutingSamplesActorSnapshot } from './routing_samples_state_machine';
import type { StreamRoutingInput, StreamRoutingServiceDependencies } from './types';
export declare const useStreamsRoutingSelector: <T>(selector: (snapshot: import("xstate").MachineSnapshot<import("./types").StreamRoutingContext, {
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
    filter: DocumentMatchFilterOptions;
} | {
    type: "routingSamples.setSelectedPreview";
    preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
} | {
    type: "suggestion.preview";
    condition: Condition;
    name: string;
    index: number;
    toggle?: boolean;
} | {
    type: "routingRule.reviewSuggested";
    id: string;
} | {
    type: "stream.received";
    definition: import("@kbn/streams-schema/src/models/ingest/wired").WiredStream.GetResponse;
} | {
    type: "suggestion.edit";
    index: number;
    suggestion: PartitionSuggestion;
} | {
    type: "suggestion.changeName";
    name: string;
} | {
    type: "suggestion.changeCondition";
    condition: Condition;
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
        condition?: Condition;
    } | {
        type: "routingSamples.setDocumentMatchFilter";
        filter: DocumentMatchFilterOptions;
    } | {
        type: "routingSamples.setSelectedPreview";
        preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
        condition: Condition;
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
            condition?: Condition;
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
            filter: DocumentMatchFilterOptions;
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
}, "initializing" | {
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
}, string, import("xstate").NonReducibleUnknown, import("xstate").MetaObject, {
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
}>) => T, compare?: ((a: T, b: T) => boolean) | undefined) => T;
export declare const useStreamsRoutingActorRef: () => import("xstate").Actor<import("xstate").StateMachine<import("./types").StreamRoutingContext, {
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
    filter: DocumentMatchFilterOptions;
} | {
    type: "routingSamples.setSelectedPreview";
    preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
} | {
    type: "suggestion.preview";
    condition: Condition;
    name: string;
    index: number;
    toggle?: boolean;
} | {
    type: "routingRule.reviewSuggested";
    id: string;
} | {
    type: "stream.received";
    definition: import("@kbn/streams-schema/src/models/ingest/wired").WiredStream.GetResponse;
} | {
    type: "suggestion.edit";
    index: number;
    suggestion: PartitionSuggestion;
} | {
    type: "suggestion.changeName";
    name: string;
} | {
    type: "suggestion.changeCondition";
    condition: Condition;
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
        condition?: Condition;
    } | {
        type: "routingSamples.setDocumentMatchFilter";
        filter: DocumentMatchFilterOptions;
    } | {
        type: "routingSamples.setSelectedPreview";
        preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
        condition: Condition;
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
            condition?: Condition;
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
            filter: DocumentMatchFilterOptions;
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
        condition?: Condition;
    } | {
        type: "routingSamples.setDocumentMatchFilter";
        filter: DocumentMatchFilterOptions;
    } | {
        type: "routingSamples.setSelectedPreview";
        preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
        condition: Condition;
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
            condition?: Condition;
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
            filter: DocumentMatchFilterOptions;
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
        definition: import("@kbn/streams-schema/src/models/ingest/wired").WiredStream.GetResponse;
    };
} | {
    type: "storeCurrentRuleId";
    params: {
        id: import("./types").StreamRoutingContext["currentRuleId"];
    };
} | {
    type: "storeDefinition";
    params: {
        definition: import("@kbn/streams-schema/src/models/ingest/wired").WiredStream.GetResponse;
    };
} | {
    type: "storeSuggestedRuleId";
    params: {
        id: import("./types").StreamRoutingContext["suggestedRuleId"];
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
}>>;
export type StreamRoutingEvents = ReturnType<typeof useStreamRoutingEvents>;
export declare const useStreamRoutingEvents: () => {
    changeChildStreamsMode: (mode: "ingestMode" | "queryMode") => void;
    cancelChanges: () => void;
    changeRule: (routingRule: Partial<RoutingDefinitionWithUIAttributes>) => void;
    /**
     * Debounced version of changeRule for text input handlers.
     * Use this when the onChange is called frequently (e.g., on every keystroke)
     * to prevent expensive state machine updates and re-renders.
     */
    changeRuleDebounced: import("lodash").DebouncedFunc<(routingRule: Partial<RoutingDefinitionWithUIAttributes>) => void>;
    createNewRule: () => void;
    removeRule: () => Promise<void>;
    reorderRules: (routing: RoutingDefinitionWithUIAttributes[]) => void;
    editRule: (id: string) => void;
    forkStream: (routingRule?: RoutingDefinition) => Promise<{
        success: boolean;
    }>;
    saveChanges: () => void;
    setConditionEditorValidity: (isValid: boolean) => void;
    setDocumentMatchFilter: (filter: DocumentMatchFilterOptions) => void;
    reviewSuggestedRule: (id: string) => void;
    editSuggestion: (index: number, suggestion: PartitionSuggestion) => void;
    changeSuggestionName: (name: string) => void;
    /**
     * Debounced version of changeSuggestionName for text input handlers.
     * Use this when the onChange is called frequently (e.g., on every keystroke)
     * to prevent expensive state machine updates and re-renders.
     */
    changeSuggestionNameDebounced: import("lodash").DebouncedFunc<(name: string) => void>;
    changeSuggestionCondition: (condition: Condition) => void;
    saveEditedSuggestion: () => void;
    createQueryStream: () => void;
    cancelQueryStreamCreation: () => void;
    saveQueryStream: ({ name, esqlQuery }: {
        name: string;
        esqlQuery: string;
    }) => void;
};
export declare const StreamRoutingContextProvider: ({ children, definition, ...deps }: React.PropsWithChildren<StreamRoutingServiceDependencies & StreamRoutingInput>) => React.JSX.Element;
export declare const useStreamSamplesRef: () => import("xstate").ActorRef<import("xstate").MachineSnapshot<import("./routing_samples_state_machine").RoutingSamplesContext, {
    type: "routingSamples.refresh";
} | {
    type: "routingSamples.updateCondition";
    condition?: Condition;
} | {
    type: "routingSamples.setDocumentMatchFilter";
    filter: DocumentMatchFilterOptions;
} | {
    type: "routingSamples.setSelectedPreview";
    preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
    condition: Condition;
} | {
    type: "routingSamples.updatePreviewName";
    name: string;
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<number | null | undefined, Pick<import("./routing_samples_state_machine").SearchParams, "definition" | "condition" | "documentMatchFilter">, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<{
        type: string;
    }, import("xstate").NonReducibleUnknown, import("xstate").EventObject>> | undefined;
}, "debouncingCondition" | {
    fetching: {
        documents: "done" | "loading";
        documentCounts: "done" | "loading";
    };
}, string, import("xstate").NonReducibleUnknown, import("xstate").MetaObject, {
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
}>, {
    type: "routingSamples.refresh";
} | {
    type: "routingSamples.updateCondition";
    condition?: Condition;
} | {
    type: "routingSamples.setDocumentMatchFilter";
    filter: DocumentMatchFilterOptions;
} | {
    type: "routingSamples.setSelectedPreview";
    preview: import("./routing_samples_state_machine").RoutingSamplesContext["selectedPreview"];
    condition: Condition;
} | {
    type: "routingSamples.updatePreviewName";
    name: string;
}, import("xstate").EventObject> | undefined;
export declare const useStreamSamplesSelector: <T>(selector: (snapshot: RoutingSamplesActorSnapshot) => T) => T;
