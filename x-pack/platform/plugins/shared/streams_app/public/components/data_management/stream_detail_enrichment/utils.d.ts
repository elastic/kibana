import type { GrokProcessor, ProcessorType, StreamlangConditionBlockWithUIAttributes, StreamlangDSL, StreamlangProcessorDefinition, StreamlangProcessorDefinitionWithUIAttributes, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { Streams, type FieldDefinition } from '@kbn/streams-schema';
import type { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import type { EnrichmentDataSource } from '../../../../common/url_schema';
import type { StreamEnrichmentContextType } from './state_management/stream_enrichment_state_machine/types';
import type { ConditionBlockFormState, EnrichmentDataSourceWithUIAttributes, ProcessorFormState } from './types';
/**
 * These are processor types with specialised UI. Other processor types are handled by a generic config-driven UI.
 */
export declare const SPECIALISED_TYPES: string[];
interface FormStateDependencies {
    grokCollection: StreamEnrichmentContextType['grokCollection'];
}
interface RecalcColumnWidthsParams {
    columnId: string;
    width: number | undefined;
    prevWidths: Record<string, number | undefined>;
    visibleColumns: string[];
}
export declare const PRIORITIZED_CONTENT_FIELDS: string[];
export declare const getDefaultTextField: (sampleDocs: FlattenRecord[], prioritizedFields: string[]) => string;
/**
 * Checks if the sample documents have valid message fields with actual content
 * that can be used for pipeline suggestion generation.
 */
export declare const hasValidMessageFieldsForSuggestion: (sampleDocs: FlattenRecord[]) => boolean;
export declare const getDefaultFormStateByType: (type: ProcessorType, sampleDocuments: FlattenRecord[], formStateDependencies: FormStateDependencies) => ProcessorFormState;
export declare const getFormStateFromActionStep: (sampleDocuments: FlattenRecord[], formStateDependencies: FormStateDependencies, step?: StreamlangProcessorDefinitionWithUIAttributes) => ProcessorFormState;
export declare const getFormStateFromConditionStep: (step: StreamlangConditionBlockWithUIAttributes) => ConditionBlockFormState;
export declare const convertConditionBlockFormStateToConfiguration: (formState: ConditionBlockFormState) => {
    conditionBlockDefinition: StreamlangConditionBlockWithUIAttributes;
};
export declare const convertFormStateToProcessor: (formState: ProcessorFormState) => {
    processorDefinition: StreamlangProcessorDefinition;
};
export declare const isDateProcessor: (processor: StreamlangProcessorDefinition) => processor is never;
export declare const isDissectProcessor: (processor: StreamlangProcessorDefinition) => processor is never;
export declare const isManualIngestPipelineJsonProcessor: (processor: StreamlangProcessorDefinition) => processor is never;
export declare const isGrokProcessor: (processor: StreamlangProcessorDefinition) => processor is never;
export declare const isSetProcessor: (processor: StreamlangProcessorDefinition) => processor is never;
export declare const stepConverter: {
    toUIDefinition: <TStepDefinition extends import("@kbn/streamlang/types/streamlang").StreamlangStep>(step: TStepDefinition, options: {
        parentId: StreamlangStepWithUIAttributes["parentId"];
    }) => StreamlangStepWithUIAttributes;
};
export declare const dataSourceConverter: {
    toUIDefinition: <TEnrichementDataSource extends EnrichmentDataSource>(dataSource: TEnrichementDataSource) => EnrichmentDataSourceWithUIAttributes;
    toUrlSchema: (dataSourceWithUIAttributes: EnrichmentDataSourceWithUIAttributes) => EnrichmentDataSource;
};
export declare const getDefaultGrokProcessor: ({ sampleDocs, }: {
    sampleDocs: FlattenRecord[];
}) => GrokProcessor;
export declare const recalcColumnWidths: ({ columnId, width, prevWidths, visibleColumns, }: RecalcColumnWidthsParams) => Record<string, number | undefined>;
export declare const getValidSteps: (steps: StreamlangStepWithUIAttributes[]) => StreamlangStepWithUIAttributes[];
export declare const getStepPanelColour: (stepIndex: number) => "subdued" | undefined;
export declare const buildUpsertStreamRequestPayload: (definition: Streams.ingest.all.GetResponse, dsl: StreamlangDSL, fields?: FieldDefinition) => {
    ingest: IngestUpsertRequest;
};
export {};
