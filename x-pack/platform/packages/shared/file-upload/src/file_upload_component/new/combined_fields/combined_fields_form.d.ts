import React, { Component } from 'react';
import type { IngestPipeline } from '@kbn/file-upload-common';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { FileAnalysis } from '../../../../file_upload_manager';
import type { CombinedField } from './types';
interface Props {
    mappings: MappingTypeMapping;
    pipelines: IngestPipeline[];
    onMappingsChange(mappings: string): void;
    onPipelinesChange(pipeline: IngestPipeline[]): void;
    combinedFields: CombinedField[];
    onCombinedFieldsChange(combinedFields: CombinedField[]): void;
    isDisabled: boolean;
    filesStatus: FileAnalysis[];
}
interface State {
    isGeoPopoverOpen: boolean;
    isSemanticPopoverOpen: boolean;
}
export type AddCombinedField = (combinedField: CombinedField, addToMappings: (mappings: MappingTypeMapping) => MappingTypeMapping, addToPipelines: (pipelines: IngestPipeline[]) => IngestPipeline[]) => void;
export declare class CombinedFieldsForm extends Component<Props, State> {
    state: State;
    togglePopover: (popover: "geo" | "semantic") => void;
    closePopover: () => void;
    addCombinedField: (combinedField: CombinedField, addToMappings: (mappings: MappingTypeMapping) => MappingTypeMapping, addToPipelines: (pipelines: IngestPipeline[]) => IngestPipeline[]) => void;
    removeCombinedField: (index: number) => void;
    hasNameCollision: (name: string) => boolean;
    isLatLonCompatible: () => boolean;
    isSemanticTextCompatible: () => boolean;
    render(): React.JSX.Element;
}
export {};
