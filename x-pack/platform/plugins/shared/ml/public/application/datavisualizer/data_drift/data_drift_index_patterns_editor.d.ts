import React from 'react';
import { type DataViewEditorService } from '@kbn/data-view-editor-plugin/public';
export declare const matchedIndicesDefault: {
    allIndices: never[];
    exactMatchedIndices: never[];
    partialMatchedIndices: never[];
    visibleIndices: never[];
};
export interface TimestampOption {
    display: string;
    fieldName?: string;
}
export declare const canAppendWildcard: (keyPressed: string) => boolean;
type DataViewEditorServiceSpec = DataViewEditorService;
export declare function DataDriftIndexPatternsEditor({ referenceDataViewEditorService, comparisonDataViewEditorService, initialReferenceIndexPattern, initialComparisonIndexPattern, }: {
    referenceDataViewEditorService: DataViewEditorServiceSpec;
    comparisonDataViewEditorService: DataViewEditorServiceSpec;
    initialReferenceIndexPattern?: string;
    initialComparisonIndexPattern?: string;
}): React.JSX.Element;
export {};
