import { Streams } from '@kbn/streams-schema';
import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import { type StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import type { StreamEnrichmentContextType, StreamEnrichmentInput, StreamEnrichmentServiceDependencies } from './types';
export type StreamEnrichmentActorRef = ActorRefFrom<typeof streamEnrichmentMachine>;
export type StreamEnrichmentActorSnapshot = SnapshotFrom<typeof streamEnrichmentMachine>;
export declare const streamEnrichmentMachine: import("xstate").StateMachine<StreamEnrichmentContextType, {
    type: "dataSource.change";
    id: string;
} | {
    type: "dataSource.dataChange";
    id: string;
} | {
    type: "dataSource.delete";
    id: string;
} | {
    type: "stream.received";
    definition: Streams.ingest.all.GetResponse;
} | {
    type: "stream.reset";
} | {
    type: "stream.update";
} | {
    type: "simulation.refresh";
} | {
    type: "simulation.viewDataPreview";
} | {
    type: "simulation.viewDetectedFields";
} | {
    type: "dataSources.add";
    dataSource: EnrichmentDataSource;
} | {
    type: "dataSources.select";
    id: string;
} | {
    type: "dataSources.closeManagement";
} | {
    type: "dataSources.openManagement";
} | {
    type: "simulation.changePreviewDocsFilter";
    filter: import("../simulation_state_machine").PreviewDocsFilterOption;
} | {
    type: "simulation.fields.map";
    field: import("../../../schema_editor/types").MappedSchemaField;
} | {
    type: "simulation.fields.unmap";
    fieldName: string;
} | {
    type: "previewColumns.updateExplicitlyEnabledColumns";
    columns: string[];
} | {
    type: "previewColumns.updateExplicitlyDisabledColumns";
    columns: string[];
} | {
    type: "previewColumns.order";
    columns: string[];
} | {
    type: "previewColumns.setSorting";
    sorting: import("../simulation_state_machine").SimulationContext["previewColumnsSorting"];
} | {
    type: "url.initialized";
    urlState: EnrichmentUrlState;
} | {
    type: "url.sync";
} | {
    type: "mode.switchToYAML";
} | {
    type: "mode.switchToInteractive";
} | {
    type: "mode.dslUpdated";
    dsl: StreamlangDSL;
} | {
    type: "mode.resetSimulator";
} | {
    type: "simulation.reset";
} | {
    type: "simulation.updateSteps";
    steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
} | {
    type: "simulation.filterByConditionAuto";
    conditionId: string;
} | {
    type: "simulation.filterByCondition";
    conditionId: string;
} | {
    type: "simulation.clearConditionFilter";
} | {
    type: "simulation.clearAutoConditionFilter";
} | {
    type: "step.addProcessor";
    step?: import("@kbn/streamlang").StreamlangProcessorDefinition;
    options?: {
        parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
    };
} | {
    type: "step.duplicateProcessor";
    processorStepId: string;
} | {
    type: "step.addCondition";
    step?: import("@kbn/streamlang").StreamlangConditionBlock;
    options?: {
        parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
    };
} | {
    type: "step.reorder";
    stepId: string;
    direction: "up" | "down";
} | {
    type: "step.reorderByDragDrop";
    sourceStepId: string;
    targetStepId: string;
    operation: "before" | "after" | "inside";
} | {
    type: "yaml.contentChanged";
    streamlangDSL: StreamlangDSL;
    yaml: string;
} | {
    type: "yaml.runSimulation";
    stepIdBreakpoint?: string;
} | {
    type: "url.initialized";
    urlState: EnrichmentUrlState;
} | {
    type: "url.sync";
} | {
    type: "step.resetSteps";
    steps: StreamlangDSL["steps"];
} | {
    type: "suggestion.generate";
    connectorId: string;
} | {
    type: "suggestion.cancel";
} | {
    type: "suggestion.accept";
} | {
    type: "suggestion.dismiss";
} | {
    type: "suggestion.regenerate";
    connectorId: string;
}, {
    [x: string]: import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("../interactive_mode_machine").InteractiveModeContext, {
        type: "step.edit";
        id?: string;
    } | {
        type: "step.cancel";
        id?: string;
    } | {
        type: "step.save";
        id: string;
    } | {
        type: "step.changeProcessor";
        id: string;
        step: import("@kbn/streamlang").StreamlangProcessorDefinition;
    } | {
        type: "step.changeCondition";
        id: string;
        step: import("@kbn/streamlang").StreamlangConditionBlock;
    } | {
        type: "step.change";
        id: string;
    } | {
        type: "step.parentChanged";
        id: string;
    } | {
        type: "step.delete";
        id: string;
    } | {
        type: "step.reorder";
        stepId: string;
        direction: "up" | "down";
    } | {
        type: "step.reorderByDragDrop";
        sourceStepId: string;
        targetStepId: string;
        operation: "before" | "after" | "inside";
    } | {
        type: "step.addProcessor";
        processor?: import("@kbn/streamlang").StreamlangProcessorDefinition;
        options?: {
            parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
        };
    } | {
        type: "step.addCondition";
        condition?: import("@kbn/streamlang").StreamlangConditionBlock;
        options?: {
            parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
        };
    } | {
        type: "step.duplicateProcessor";
        processorStepId: string;
    } | {
        type: "step.filterByCondition";
        conditionId: string;
    } | {
        type: "step.clearConditionFilter";
    } | {
        type: "dataSource.activeChanged";
        simulationMode: import("../data_source_state_machine").DataSourceSimulationMode;
    } | {
        type: "suggestion.generate";
        connectorId: string;
    } | {
        type: "suggestion.cancel";
    } | {
        type: "suggestion.accept";
    } | {
        type: "suggestion.dismiss";
    } | {
        type: "suggestion.regenerate";
        connectorId: string;
    } | {
        type: "step.resetSteps";
        steps: StreamlangDSL["steps"];
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<StreamlangDSL, import("../interactive_mode_machine/suggest_pipeline_actor").SuggestPipelineInputMinimal, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("../steps_state_machine").StepContext, {
            type: "step.cancel";
        } | {
            type: "step.changeProcessor";
            step: import("@kbn/streamlang").StreamlangProcessorDefinition;
        } | {
            type: "step.changeCondition";
            step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
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
                step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
            };
        } | {
            type: "changeProcessor";
            params: {
                step: import("@kbn/streamlang").StreamlangProcessorDefinition;
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
        }, string, import("../steps_state_machine").StepInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
        }>> | undefined;
    }, {
        src: "suggestPipeline";
        logic: import("xstate").PromiseActorLogic<StreamlangDSL, import("../interactive_mode_machine/suggest_pipeline_actor").SuggestPipelineInputMinimal, import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "stepMachine";
        logic: import("xstate").StateMachine<import("../steps_state_machine").StepContext, {
            type: "step.cancel";
        } | {
            type: "step.changeProcessor";
            step: import("@kbn/streamlang").StreamlangProcessorDefinition;
        } | {
            type: "step.changeCondition";
            step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
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
                step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
            };
        } | {
            type: "changeProcessor";
            params: {
                step: import("@kbn/streamlang").StreamlangProcessorDefinition;
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
        }, string, import("../steps_state_machine").StepInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
        id: string | undefined;
    }, {
        type: "setActiveDataSource";
        params: {
            simulationMode: import("../interactive_mode_machine").InteractiveModeContext["simulationMode"];
        };
    } | {
        type: "sendStepsToSimulator";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifySuggestionFailure";
        params: {
            event: {
                error: unknown;
            };
        };
    } | {
        type: "addProcessor";
        params: {
            processor?: import("@kbn/streamlang").StreamlangProcessorDefinition;
            options?: {
                parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
            };
        };
    } | {
        type: "duplicateProcessor";
        params: {
            processorStepId: string;
        };
    } | {
        type: "addCondition";
        params: {
            condition?: import("@kbn/streamlang").StreamlangConditionBlock;
            options?: {
                parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
            };
        };
    } | {
        type: "maybeAutoSelectParentConditionForProcessor";
        params: {
            id?: string;
        };
    } | {
        type: "deleteStep";
        params: {
            id: string;
        };
    } | {
        type: "reorderSteps";
        params: {
            stepId: string;
            direction: "up" | "down";
        };
    } | {
        type: "reorderStepsByDragDrop";
        params: {
            sourceStepId: string;
            targetStepId: string;
            operation: "before" | "after" | "inside";
        };
    } | {
        type: "reassignSteps";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "syncToDSL";
        params: unknown;
    } | {
        type: "storeConditionFilter";
        params: {
            conditionId: string | undefined;
        };
    } | {
        type: "overwriteSteps";
        params: {
            steps: StreamlangDSL["steps"];
        };
    } | {
        type: "storeSuggestedPipeline";
        params: {
            pipeline: StreamlangDSL;
        };
    } | {
        type: "clearSuggestion";
        params: import("xstate").NonReducibleUnknown;
    }, {
        type: "hasManagePrivileges";
        params: unknown;
    } | {
        type: "hasSimulatePrivileges";
        params: unknown;
    } | {
        type: "hasStagedChanges";
        params: unknown;
    }, never, {
        steps: "idle" | "editing" | "creating";
        pipelineSuggestion: "idle" | "generatingSuggestion" | "viewingSuggestion" | "noSuggestionsFound";
    }, string, import("../interactive_mode_machine").InteractiveModeInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "interactiveMode";
        states: {
            readonly pipelineSuggestion: {
                states: {
                    readonly idle: {};
                    readonly generatingSuggestion: {};
                    readonly noSuggestionsFound: {};
                    readonly viewingSuggestion: {};
                };
            };
            readonly steps: {
                states: {
                    readonly idle: {};
                    readonly creating: {};
                    readonly editing: {};
                };
            };
        };
    }>> | import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("../yaml_mode_machine").YamlModeContext, {
        type: "yaml.contentChanged";
        streamlangDSL: StreamlangDSL;
        yaml: string;
    } | {
        type: "yaml.runSimulation";
        stepIdBreakpoint?: string;
    } | {
        type: "dataSource.activeChanged";
        simulationMode: import("../data_source_state_machine").DataSourceSimulationMode;
    }, {}, never, {
        type: "updateDSL";
        params: {
            streamlangDSL: StreamlangDSL;
            yaml: string;
        };
    } | {
        type: "sendDSLToParent";
        params: unknown;
    } | {
        type: "setActiveDataSource";
        params: {
            simulationMode: import("../yaml_mode_machine").YamlModeContext["simulationMode"];
        };
    } | {
        type: "sendStepsToSimulator";
        params: {
            stepIdBreakpoint?: string;
        } | undefined;
    }, {
        type: "hasSimulatePrivileges";
        params: unknown;
    } | {
        type: "canSimulate";
        params: unknown;
    } | {
        type: "hasStagedChanges";
        params: unknown;
    }, never, "editing", string, import("../yaml_mode_machine").YamlModeInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "yamlMode";
        states: {
            readonly editing: {};
        };
    }>> | import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("../simulation_state_machine").SimulationContext, {
        type: "previewColumns.order";
        columns: string[];
    } | {
        type: "previewColumns.setSorting";
        sorting: import("../simulation_state_machine").SimulationContext["previewColumnsSorting"];
    } | {
        type: "previewColumns.updateExplicitlyDisabledColumns";
        columns: string[];
    } | {
        type: "previewColumns.updateExplicitlyEnabledColumns";
        columns: string[];
    } | {
        type: "simulation.filterByCondition";
        conditionId: string;
    } | {
        type: "simulation.clearConditionFilter";
    } | {
        type: "simulation.changePreviewDocsFilter";
        filter: import("../simulation_state_machine").PreviewDocsFilterOption;
    } | {
        type: "simulation.fields.map";
        field: import("../../../schema_editor/types").MappedSchemaField;
    } | {
        type: "simulation.fields.unmap";
        fieldName: string;
    } | {
        type: "simulation.receive_samples";
        samples: import("../simulation_state_machine").SampleDocumentWithUIAttributes[];
    } | {
        type: "simulation.receive_steps";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    } | {
        type: "simulation.updateSteps";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    } | {
        type: "simulation.reset";
    } | {
        type: "step.change";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    } | {
        type: "step.delete";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("@kbn/streams-schema").ProcessingSimulationResponse, import("../simulation_state_machine/simulation_runner_actor").SimulationRunnerInput, import("xstate").EventObject>> | undefined;
    }, {
        src: "runSimulation";
        logic: import("xstate").PromiseActorLogic<import("@kbn/streams-schema").ProcessingSimulationResponse, import("../simulation_state_machine/simulation_runner_actor").SimulationRunnerInput, import("xstate").EventObject>;
        id: string | undefined;
    }, {
        type: "notifySimulationRunFailure";
        params: unknown;
    } | {
        type: "storePreviewDocsFilter";
        params: {
            filter: import("../simulation_state_machine").PreviewDocsFilterOption;
        };
    } | {
        type: "storeSteps";
        params: import("../simulation_state_machine").StepsEventParams;
    } | {
        type: "storeSamples";
        params: {
            samples: import("../simulation_state_machine").SampleDocumentWithUIAttributes[];
        };
    } | {
        type: "storeSimulation";
        params: {
            simulation: import("../simulation_state_machine").Simulation | undefined;
        };
    } | {
        type: "storeExplicitlyEnabledPreviewColumns";
        params: {
            columns: string[];
        };
    } | {
        type: "storeExplicitlyDisabledPreviewColumns";
        params: {
            columns: string[];
        };
    } | {
        type: "storePreviewColumnsOrder";
        params: {
            columns: string[];
        };
    } | {
        type: "storePreviewColumnsSorting";
        params: {
            sorting: import("../simulation_state_machine").SimulationContext["previewColumnsSorting"];
        };
    } | {
        type: "deriveDetectedSchemaFields";
        params: unknown;
    } | {
        type: "mapField";
        params: {
            field: import("../../../schema_editor/types").MappedSchemaField;
        };
    } | {
        type: "unmapField";
        params: {
            fieldName: string;
        };
    } | {
        type: "resetSimulationOutcome";
        params: unknown;
    } | {
        type: "resetSteps";
        params: unknown;
    } | {
        type: "resetSamples";
        params: unknown;
    } | {
        type: "applyConditionFilter";
        params: {
            conditionId: string;
        };
    } | {
        type: "clearConditionFilter";
        params: unknown;
    }, {
        type: "canSimulate";
        params: unknown;
    } | {
        type: "hasSteps";
        params: import("../simulation_state_machine").StepsEventParams;
    } | {
        type: "!hasSamples";
        params: {
            samples: import("../simulation_state_machine").SampleDocumentWithUIAttributes[];
        };
    }, "processorChangeDebounceTime", "idle" | "assertingRequirements" | "debouncingChanges" | "runningSimulation", string, import("../simulation_state_machine").SimulationInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "simulation";
        states: {
            readonly idle: {};
            readonly debouncingChanges: {};
            readonly assertingRequirements: {};
            readonly runningSimulation: {};
        };
    }>> | import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, import("./upsert_stream_actor").UpsertStreamInput, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("../data_source_state_machine").DataSourceContext, {
        type: "dataSource.change";
        dataSource: import("../../types").EnrichmentDataSourceWithUIAttributes;
    } | {
        type: "dataSource.delete";
    } | {
        type: "dataSource.refresh";
    } | {
        type: "dataSource.enable";
    } | {
        type: "dataSource.disable";
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], import("../data_source_state_machine/data_collector_actor").SamplesFetchInput, import("xstate").EventObject>> | undefined;
    }, {
        src: "collectData";
        logic: import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], import("../data_source_state_machine/data_collector_actor").SamplesFetchInput, import("xstate").EventObject>;
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
            dataSource: import("../../types").EnrichmentDataSourceWithUIAttributes;
        };
    } | {
        type: "storeData";
        params: {
            data: import("@kbn/streams-schema").SampleDocument[];
        };
    } | {
        type: "toggleDataSourceActivity";
        params: unknown;
    } | {
        type: "notifyParent";
        params: {
            eventType: import("../data_source_state_machine").DataSourceToParentEvent["type"];
        };
    }, {
        type: "isEnabled";
        params: unknown;
    } | {
        type: "isValidData";
        params: {
            data?: import("@kbn/streams-schema").SampleDocument[];
        };
    } | {
        type: "isCustomSamples";
        params: unknown;
    } | {
        type: "shouldCollectData";
        params: unknown;
    }, "customSamplesDebounce", "disabled" | "deleted" | "determining" | {
        enabled: "idle" | "loadingData" | "debouncingChange";
    }, string, import("../data_source_state_machine").DataSourceInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    }>> | import("xstate").ActorRefFromLogic<import("xstate").CallbackActorLogic<import("xstate").EventObject, import("xstate").NonReducibleUnknown, import("xstate").EventObject>> | undefined;
}, {
    src: "upsertStream";
    logic: import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, import("./upsert_stream_actor").UpsertStreamInput, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "dataSourceMachine";
    logic: import("xstate").StateMachine<import("../data_source_state_machine").DataSourceContext, {
        type: "dataSource.change";
        dataSource: import("../../types").EnrichmentDataSourceWithUIAttributes;
    } | {
        type: "dataSource.delete";
    } | {
        type: "dataSource.refresh";
    } | {
        type: "dataSource.enable";
    } | {
        type: "dataSource.disable";
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], import("../data_source_state_machine/data_collector_actor").SamplesFetchInput, import("xstate").EventObject>> | undefined;
    }, {
        src: "collectData";
        logic: import("xstate").ObservableActorLogic<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[], import("../data_source_state_machine/data_collector_actor").SamplesFetchInput, import("xstate").EventObject>;
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
            dataSource: import("../../types").EnrichmentDataSourceWithUIAttributes;
        };
    } | {
        type: "storeData";
        params: {
            data: import("@kbn/streams-schema").SampleDocument[];
        };
    } | {
        type: "toggleDataSourceActivity";
        params: unknown;
    } | {
        type: "notifyParent";
        params: {
            eventType: import("../data_source_state_machine").DataSourceToParentEvent["type"];
        };
    }, {
        type: "isEnabled";
        params: unknown;
    } | {
        type: "isValidData";
        params: {
            data?: import("@kbn/streams-schema").SampleDocument[];
        };
    } | {
        type: "isCustomSamples";
        params: unknown;
    } | {
        type: "shouldCollectData";
        params: unknown;
    }, "customSamplesDebounce", "disabled" | "deleted" | "determining" | {
        enabled: "idle" | "loadingData" | "debouncingChange";
    }, string, import("../data_source_state_machine").DataSourceInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
    id: string | undefined;
} | {
    src: "initializeUrl";
    logic: import("xstate").CallbackActorLogic<import("xstate").EventObject, import("xstate").NonReducibleUnknown, import("xstate").EventObject>;
    id: string | undefined;
} | {
    src: "simulationMachine";
    logic: import("xstate").StateMachine<import("../simulation_state_machine").SimulationContext, {
        type: "previewColumns.order";
        columns: string[];
    } | {
        type: "previewColumns.setSorting";
        sorting: import("../simulation_state_machine").SimulationContext["previewColumnsSorting"];
    } | {
        type: "previewColumns.updateExplicitlyDisabledColumns";
        columns: string[];
    } | {
        type: "previewColumns.updateExplicitlyEnabledColumns";
        columns: string[];
    } | {
        type: "simulation.filterByCondition";
        conditionId: string;
    } | {
        type: "simulation.clearConditionFilter";
    } | {
        type: "simulation.changePreviewDocsFilter";
        filter: import("../simulation_state_machine").PreviewDocsFilterOption;
    } | {
        type: "simulation.fields.map";
        field: import("../../../schema_editor/types").MappedSchemaField;
    } | {
        type: "simulation.fields.unmap";
        fieldName: string;
    } | {
        type: "simulation.receive_samples";
        samples: import("../simulation_state_machine").SampleDocumentWithUIAttributes[];
    } | {
        type: "simulation.receive_steps";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    } | {
        type: "simulation.updateSteps";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    } | {
        type: "simulation.reset";
    } | {
        type: "step.change";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    } | {
        type: "step.delete";
        steps: import("@kbn/streamlang").StreamlangStepWithUIAttributes[];
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<import("@kbn/streams-schema").ProcessingSimulationResponse, import("../simulation_state_machine/simulation_runner_actor").SimulationRunnerInput, import("xstate").EventObject>> | undefined;
    }, {
        src: "runSimulation";
        logic: import("xstate").PromiseActorLogic<import("@kbn/streams-schema").ProcessingSimulationResponse, import("../simulation_state_machine/simulation_runner_actor").SimulationRunnerInput, import("xstate").EventObject>;
        id: string | undefined;
    }, {
        type: "notifySimulationRunFailure";
        params: unknown;
    } | {
        type: "storePreviewDocsFilter";
        params: {
            filter: import("../simulation_state_machine").PreviewDocsFilterOption;
        };
    } | {
        type: "storeSteps";
        params: import("../simulation_state_machine").StepsEventParams;
    } | {
        type: "storeSamples";
        params: {
            samples: import("../simulation_state_machine").SampleDocumentWithUIAttributes[];
        };
    } | {
        type: "storeSimulation";
        params: {
            simulation: import("../simulation_state_machine").Simulation | undefined;
        };
    } | {
        type: "storeExplicitlyEnabledPreviewColumns";
        params: {
            columns: string[];
        };
    } | {
        type: "storeExplicitlyDisabledPreviewColumns";
        params: {
            columns: string[];
        };
    } | {
        type: "storePreviewColumnsOrder";
        params: {
            columns: string[];
        };
    } | {
        type: "storePreviewColumnsSorting";
        params: {
            sorting: import("../simulation_state_machine").SimulationContext["previewColumnsSorting"];
        };
    } | {
        type: "deriveDetectedSchemaFields";
        params: unknown;
    } | {
        type: "mapField";
        params: {
            field: import("../../../schema_editor/types").MappedSchemaField;
        };
    } | {
        type: "unmapField";
        params: {
            fieldName: string;
        };
    } | {
        type: "resetSimulationOutcome";
        params: unknown;
    } | {
        type: "resetSteps";
        params: unknown;
    } | {
        type: "resetSamples";
        params: unknown;
    } | {
        type: "applyConditionFilter";
        params: {
            conditionId: string;
        };
    } | {
        type: "clearConditionFilter";
        params: unknown;
    }, {
        type: "canSimulate";
        params: unknown;
    } | {
        type: "hasSteps";
        params: import("../simulation_state_machine").StepsEventParams;
    } | {
        type: "!hasSamples";
        params: {
            samples: import("../simulation_state_machine").SampleDocumentWithUIAttributes[];
        };
    }, "processorChangeDebounceTime", "idle" | "assertingRequirements" | "debouncingChanges" | "runningSimulation", string, import("../simulation_state_machine").SimulationInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "simulation";
        states: {
            readonly idle: {};
            readonly debouncingChanges: {};
            readonly assertingRequirements: {};
            readonly runningSimulation: {};
        };
    }>;
    id: string | undefined;
} | {
    src: "interactiveModeMachine";
    logic: import("xstate").StateMachine<import("../interactive_mode_machine").InteractiveModeContext, {
        type: "step.edit";
        id?: string;
    } | {
        type: "step.cancel";
        id?: string;
    } | {
        type: "step.save";
        id: string;
    } | {
        type: "step.changeProcessor";
        id: string;
        step: import("@kbn/streamlang").StreamlangProcessorDefinition;
    } | {
        type: "step.changeCondition";
        id: string;
        step: import("@kbn/streamlang").StreamlangConditionBlock;
    } | {
        type: "step.change";
        id: string;
    } | {
        type: "step.parentChanged";
        id: string;
    } | {
        type: "step.delete";
        id: string;
    } | {
        type: "step.reorder";
        stepId: string;
        direction: "up" | "down";
    } | {
        type: "step.reorderByDragDrop";
        sourceStepId: string;
        targetStepId: string;
        operation: "before" | "after" | "inside";
    } | {
        type: "step.addProcessor";
        processor?: import("@kbn/streamlang").StreamlangProcessorDefinition;
        options?: {
            parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
        };
    } | {
        type: "step.addCondition";
        condition?: import("@kbn/streamlang").StreamlangConditionBlock;
        options?: {
            parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
        };
    } | {
        type: "step.duplicateProcessor";
        processorStepId: string;
    } | {
        type: "step.filterByCondition";
        conditionId: string;
    } | {
        type: "step.clearConditionFilter";
    } | {
        type: "dataSource.activeChanged";
        simulationMode: import("../data_source_state_machine").DataSourceSimulationMode;
    } | {
        type: "suggestion.generate";
        connectorId: string;
    } | {
        type: "suggestion.cancel";
    } | {
        type: "suggestion.accept";
    } | {
        type: "suggestion.dismiss";
    } | {
        type: "suggestion.regenerate";
        connectorId: string;
    } | {
        type: "step.resetSteps";
        steps: StreamlangDSL["steps"];
    }, {
        [x: string]: import("xstate").ActorRefFromLogic<import("xstate").PromiseActorLogic<StreamlangDSL, import("../interactive_mode_machine/suggest_pipeline_actor").SuggestPipelineInputMinimal, import("xstate").EventObject>> | import("xstate").ActorRefFromLogic<import("xstate").StateMachine<import("../steps_state_machine").StepContext, {
            type: "step.cancel";
        } | {
            type: "step.changeProcessor";
            step: import("@kbn/streamlang").StreamlangProcessorDefinition;
        } | {
            type: "step.changeCondition";
            step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
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
                step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
            };
        } | {
            type: "changeProcessor";
            params: {
                step: import("@kbn/streamlang").StreamlangProcessorDefinition;
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
        }, string, import("../steps_state_machine").StepInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
        }>> | undefined;
    }, {
        src: "suggestPipeline";
        logic: import("xstate").PromiseActorLogic<StreamlangDSL, import("../interactive_mode_machine/suggest_pipeline_actor").SuggestPipelineInputMinimal, import("xstate").EventObject>;
        id: string | undefined;
    } | {
        src: "stepMachine";
        logic: import("xstate").StateMachine<import("../steps_state_machine").StepContext, {
            type: "step.cancel";
        } | {
            type: "step.changeProcessor";
            step: import("@kbn/streamlang").StreamlangProcessorDefinition;
        } | {
            type: "step.changeCondition";
            step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
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
                step: import("@kbn/streamlang").StreamlangConditionBlockWithUIAttributes;
            };
        } | {
            type: "changeProcessor";
            params: {
                step: import("@kbn/streamlang").StreamlangProcessorDefinition;
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
        }, string, import("../steps_state_machine").StepInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
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
        id: string | undefined;
    }, {
        type: "setActiveDataSource";
        params: {
            simulationMode: import("../interactive_mode_machine").InteractiveModeContext["simulationMode"];
        };
    } | {
        type: "sendStepsToSimulator";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "notifySuggestionFailure";
        params: {
            event: {
                error: unknown;
            };
        };
    } | {
        type: "addProcessor";
        params: {
            processor?: import("@kbn/streamlang").StreamlangProcessorDefinition;
            options?: {
                parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
            };
        };
    } | {
        type: "duplicateProcessor";
        params: {
            processorStepId: string;
        };
    } | {
        type: "addCondition";
        params: {
            condition?: import("@kbn/streamlang").StreamlangConditionBlock;
            options?: {
                parentId: import("@kbn/streamlang").StreamlangStepWithUIAttributes["parentId"];
            };
        };
    } | {
        type: "maybeAutoSelectParentConditionForProcessor";
        params: {
            id?: string;
        };
    } | {
        type: "deleteStep";
        params: {
            id: string;
        };
    } | {
        type: "reorderSteps";
        params: {
            stepId: string;
            direction: "up" | "down";
        };
    } | {
        type: "reorderStepsByDragDrop";
        params: {
            sourceStepId: string;
            targetStepId: string;
            operation: "before" | "after" | "inside";
        };
    } | {
        type: "reassignSteps";
        params: import("xstate").NonReducibleUnknown;
    } | {
        type: "syncToDSL";
        params: unknown;
    } | {
        type: "storeConditionFilter";
        params: {
            conditionId: string | undefined;
        };
    } | {
        type: "overwriteSteps";
        params: {
            steps: StreamlangDSL["steps"];
        };
    } | {
        type: "storeSuggestedPipeline";
        params: {
            pipeline: StreamlangDSL;
        };
    } | {
        type: "clearSuggestion";
        params: import("xstate").NonReducibleUnknown;
    }, {
        type: "hasManagePrivileges";
        params: unknown;
    } | {
        type: "hasSimulatePrivileges";
        params: unknown;
    } | {
        type: "hasStagedChanges";
        params: unknown;
    }, never, {
        steps: "idle" | "editing" | "creating";
        pipelineSuggestion: "idle" | "generatingSuggestion" | "viewingSuggestion" | "noSuggestionsFound";
    }, string, import("../interactive_mode_machine").InteractiveModeInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "interactiveMode";
        states: {
            readonly pipelineSuggestion: {
                states: {
                    readonly idle: {};
                    readonly generatingSuggestion: {};
                    readonly noSuggestionsFound: {};
                    readonly viewingSuggestion: {};
                };
            };
            readonly steps: {
                states: {
                    readonly idle: {};
                    readonly creating: {};
                    readonly editing: {};
                };
            };
        };
    }>;
    id: string | undefined;
} | {
    src: "yamlModeMachine";
    logic: import("xstate").StateMachine<import("../yaml_mode_machine").YamlModeContext, {
        type: "yaml.contentChanged";
        streamlangDSL: StreamlangDSL;
        yaml: string;
    } | {
        type: "yaml.runSimulation";
        stepIdBreakpoint?: string;
    } | {
        type: "dataSource.activeChanged";
        simulationMode: import("../data_source_state_machine").DataSourceSimulationMode;
    }, {}, never, {
        type: "updateDSL";
        params: {
            streamlangDSL: StreamlangDSL;
            yaml: string;
        };
    } | {
        type: "sendDSLToParent";
        params: unknown;
    } | {
        type: "setActiveDataSource";
        params: {
            simulationMode: import("../yaml_mode_machine").YamlModeContext["simulationMode"];
        };
    } | {
        type: "sendStepsToSimulator";
        params: {
            stepIdBreakpoint?: string;
        } | undefined;
    }, {
        type: "hasSimulatePrivileges";
        params: unknown;
    } | {
        type: "canSimulate";
        params: unknown;
    } | {
        type: "hasStagedChanges";
        params: unknown;
    }, never, "editing", string, import("../yaml_mode_machine").YamlModeInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
        id: "yamlMode";
        states: {
            readonly editing: {};
        };
    }>;
    id: string | undefined;
}, {
    type: "refreshDefinition";
    params: unknown;
} | {
    type: "storeDefinition";
    params: {
        definition: Streams.ingest.all.GetResponse;
    };
} | {
    type: "clearConditionFilter";
    params: unknown;
} | {
    type: "filterByCondition";
    params: {
        conditionId: string;
    };
} | {
    type: "updateDSL";
    params: {
        dsl: StreamlangDSL;
    };
} | {
    type: "notifyUpsertStreamSuccess";
    params: unknown;
} | {
    type: "notifyUpsertStreamFailure";
    params: unknown;
} | {
    type: "computeValidation";
    params: unknown;
} | {
    type: "storeUrlState";
    params: {
        urlState: EnrichmentUrlState;
    };
} | {
    type: "syncUrlState";
    params: unknown;
} | {
    type: "resetStateFromDefinition";
    params: unknown;
} | {
    type: "spawnInteractiveMode";
    params: unknown;
} | {
    type: "spawnYamlMode";
    params: unknown;
} | {
    type: "stopInteractiveMode";
    params: unknown;
} | {
    type: "stopYamlMode";
    params: unknown;
} | {
    type: "setupDataSources";
    params: unknown;
} | {
    type: "addDataSource";
    params: {
        dataSource: EnrichmentDataSource;
    };
} | {
    type: "deleteDataSource";
    params: {
        id: string;
    };
} | {
    type: "refreshDataSources";
    params: unknown;
} | {
    type: "notifyActiveDataSourceChange";
    params: unknown;
} | {
    type: "sendDataSourcesSamplesToSimulator";
    params: unknown;
} | {
    type: "sendResetToSimulator";
    params: unknown;
} | {
    type: "sendResetEventToSimulator";
    params: unknown;
} | {
    type: "storeAutoSelectedConditionId";
    params: {
        conditionId: string;
    };
} | {
    type: "clearAutoSelectedConditionId";
    params: unknown;
}, {
    type: "canUpdateStream";
    params: unknown;
} | {
    type: "hasManagePrivileges";
    params: unknown;
} | {
    type: "hasSimulatePrivileges";
    params: unknown;
} | {
    type: "hasAutoSelectedConditionId";
    params: unknown;
} | {
    type: "canSwitchToInteractiveMode";
    params: unknown;
} | {
    type: "hasNoValidationErrors";
    params: unknown;
}, never, "initializingFromUrl" | {
    ready: {
        stream: "idle" | "updating";
        enrichment: {
            displayingSimulation: "viewDataPreview" | "viewDetectedFields";
            managingDataSources: "open" | "closed";
            managingProcessors: "interactive" | "yaml" | "evaluatingMode";
        };
    };
}, string, StreamEnrichmentInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "enrichStream";
    states: {
        readonly initializingFromUrl: {};
        readonly ready: {
            id: "ready";
            states: {
                readonly stream: {
                    states: {
                        readonly idle: {};
                        readonly updating: {};
                    };
                };
                readonly enrichment: {
                    states: {
                        readonly displayingSimulation: {
                            states: {
                                readonly viewDataPreview: {};
                                readonly viewDetectedFields: {};
                            };
                        };
                        readonly managingDataSources: {
                            states: {
                                readonly closed: {};
                                readonly open: {};
                            };
                        };
                        readonly managingProcessors: {
                            id: "managingProcessors";
                            states: {
                                readonly evaluatingMode: {};
                                readonly interactive: {};
                                readonly yaml: {};
                            };
                        };
                    };
                };
            };
        };
    };
}>;
export declare const createStreamEnrichmentMachineImplementations: ({ refreshDefinition, streamsRepositoryClient, core, data, urlStateStorageContainer, telemetryClient, }: StreamEnrichmentServiceDependencies) => MachineImplementationsFrom<typeof streamEnrichmentMachine>;
