import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { GrokCollection } from '@kbn/grok-ui';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { FieldType, StreamlangConditionBlock, StreamlangDSL, StreamlangProcessorDefinition, StreamlangStepWithUIAttributes, StreamlangValidationError } from '@kbn/streamlang';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { Streams } from '@kbn/streams-schema';
import type { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import type { MappedSchemaField } from '../../../schema_editor/types';
import type { DataSourceActorRef, DataSourceToParentEvent } from '../data_source_state_machine';
import type { InteractiveModeActorRef } from '../interactive_mode_machine';
import type { PreviewDocsFilterOption, SimulationActorRef, SimulationContext } from '../simulation_state_machine';
import type { YamlModeActorRef } from '../yaml_mode_machine';
export interface StreamPrivileges {
    manage: boolean;
    simulate: boolean;
}
export interface StreamEnrichmentServiceDependencies {
    refreshDefinition: () => void;
    streamsRepositoryClient: StreamsRepositoryClient;
    core: CoreStart;
    data: DataPublicPluginStart;
    urlStateStorageContainer: IKbnUrlStateStorage;
    telemetryClient: StreamsTelemetryClient;
}
export interface StreamEnrichmentInput {
    definition: Streams.ingest.all.GetResponse;
    grokCollection: GrokCollection;
}
export interface StreamEnrichmentContextType {
    definition: Streams.ingest.all.GetResponse;
    dataSourcesRefs: DataSourceActorRef[];
    grokCollection: GrokCollection;
    simulatorRef: SimulationActorRef;
    urlState: EnrichmentUrlState;
    interactiveModeRef: InteractiveModeActorRef | undefined;
    yamlModeRef: YamlModeActorRef | undefined;
    nextStreamlangDSL: StreamlangDSL;
    previousStreamlangDSL: StreamlangDSL;
    hasChanges: boolean;
    schemaErrors: string[];
    validationErrors: Map<string, StreamlangValidationError[]>;
    fieldTypesByProcessor: Map<string, Map<string, FieldType>>;
    /**
     * Tracks whether the current condition filter was applied automatically by the UI
     * (e.g. right after creating a condition block). If set, some user actions (save/cancel
     * processor edits) will clear the filter for convenience.
     */
    autoSelectedConditionId?: string;
}
export type StreamEnrichmentEvent = DataSourceToParentEvent | {
    type: 'stream.received';
    definition: Streams.ingest.all.GetResponse;
} | {
    type: 'stream.reset';
} | {
    type: 'stream.update';
} | {
    type: 'simulation.refresh';
} | {
    type: 'simulation.viewDataPreview';
} | {
    type: 'simulation.viewDetectedFields';
} | {
    type: 'dataSources.add';
    dataSource: EnrichmentDataSource;
} | {
    type: 'dataSources.select';
    id: string;
} | {
    type: 'dataSources.closeManagement';
} | {
    type: 'dataSources.openManagement';
} | {
    type: 'simulation.changePreviewDocsFilter';
    filter: PreviewDocsFilterOption;
} | {
    type: 'simulation.fields.map';
    field: MappedSchemaField;
} | {
    type: 'simulation.fields.unmap';
    fieldName: string;
} | {
    type: 'previewColumns.updateExplicitlyEnabledColumns';
    columns: string[];
} | {
    type: 'previewColumns.updateExplicitlyDisabledColumns';
    columns: string[];
} | {
    type: 'previewColumns.order';
    columns: string[];
} | {
    type: 'previewColumns.setSorting';
    sorting: SimulationContext['previewColumnsSorting'];
} | {
    type: 'url.initialized';
    urlState: EnrichmentUrlState;
} | {
    type: 'url.sync';
} | {
    type: 'mode.switchToYAML';
} | {
    type: 'mode.switchToInteractive';
} | {
    type: 'mode.dslUpdated';
    dsl: StreamlangDSL;
} | {
    type: 'mode.resetSimulator';
} | {
    type: 'simulation.reset';
} | {
    type: 'simulation.updateSteps';
    steps: StreamlangStepWithUIAttributes[];
} | {
    type: 'simulation.filterByConditionAuto';
    conditionId: string;
} | {
    type: 'simulation.filterByCondition';
    conditionId: string;
} | {
    type: 'simulation.clearConditionFilter';
} | {
    type: 'simulation.clearAutoConditionFilter';
} | {
    type: 'step.addProcessor';
    step?: StreamlangProcessorDefinition;
    options?: {
        parentId: StreamlangStepWithUIAttributes['parentId'];
    };
} | {
    type: 'step.duplicateProcessor';
    processorStepId: string;
} | {
    type: 'step.addCondition';
    step?: StreamlangConditionBlock;
    options?: {
        parentId: StreamlangStepWithUIAttributes['parentId'];
    };
} | {
    type: 'step.reorder';
    stepId: string;
    direction: 'up' | 'down';
} | {
    type: 'step.reorderByDragDrop';
    sourceStepId: string;
    targetStepId: string;
    operation: 'before' | 'after' | 'inside';
} | {
    type: 'yaml.contentChanged';
    streamlangDSL: StreamlangDSL;
    yaml: string;
} | {
    type: 'yaml.runSimulation';
    stepIdBreakpoint?: string;
} | {
    type: 'url.initialized';
    urlState: EnrichmentUrlState;
} | {
    type: 'url.sync';
} | {
    type: 'step.resetSteps';
    steps: StreamlangDSL['steps'];
} | {
    type: 'suggestion.generate';
    connectorId: string;
} | {
    type: 'suggestion.cancel';
} | {
    type: 'suggestion.accept';
} | {
    type: 'suggestion.dismiss';
} | {
    type: 'suggestion.regenerate';
    connectorId: string;
};
