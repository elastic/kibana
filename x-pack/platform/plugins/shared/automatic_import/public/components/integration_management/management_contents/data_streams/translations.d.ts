export declare const ADD_DATA_STREAM_BUTTON: string;
export declare const ADD_DATA_STREAM_DISABLED_TOOLTIP: string;
export declare const DATA_STREAMS_TITLE: string;
export declare const DATA_STREAMS_DESCRIPTION: string;
export declare const CREATE_DATA_STREAM_TITLE: string;
export declare const CREATE_DATA_STREAM_DESCRIPTION: string;
export declare const DATA_STREAM_TITLE_LABEL: string;
export declare const DATA_STREAM_DESCRIPTION_LABEL: string;
export declare const DATA_COLLECTION_METHOD_LABEL: string;
export declare const LOGS_SECTION_TITLE: string;
export declare const LOGS_SECTION_DESCRIPTION: string;
export declare const LOG_SAMPLE_REQUIRED_FOR_ANALYSIS: string;
export declare const AI_ANALYSIS_CALLOUT: string;
export declare const UPLOAD_LOG_FILE_LABEL: string;
export declare const SELECT_INDEX_LABEL: string;
export declare const FILE_PICKER_PROMPT: string;
export declare const CANCEL_BUTTON: string;
export declare const ANALYZE_LOGS_BUTTON: string;
export declare const ANALYZE_LOGS_DISABLED_LOADING: string;
export declare const CREATE_DATA_STREAM_ERROR: string;
export declare const SAMPLES_NORMALIZED_WARNING_TITLE: string;
export declare const SAMPLES_NORMALIZED_WARNING_LINES_OMITTED: (omittedCount: number, maxLines: number) => string;
export declare const LOG_FILE_ERROR: {
    CAN_NOT_READ: string;
    CAN_NOT_READ_WITH_REASON: (reason: string) => string;
    TOO_LARGE_TO_PARSE: string;
};
export declare const SELECT_PLACEHOLDER: string;
export declare const ZERO_STATE_DESCRIPTION: string;
export declare const TABLE_COLUMN_HEADERS: Readonly<{
    title: string;
    dataCollectionMethods: string;
    status: string;
    actions: string;
    field: string;
    value: string;
}>;
export declare const TABLE_ACTIONS: Readonly<{
    expand: string;
    expandDescription: string;
    refresh: string;
    refreshDescription: string;
    delete: string;
    deleteDescription: string;
}>;
export declare const DELETE_MODAL: Readonly<{
    title: (dataStreamTitle: string) => string;
    cancelButton: string;
    confirmButton: string;
}>;
export declare const REANALYZE_MODAL: Readonly<{
    title: (dataStreamTitle: string) => string;
    body: string;
    cancelButton: string;
    confirmButton: string;
}>;
export declare const EDIT_PIPELINE_FLYOUT: Readonly<{
    tableCaption: string;
    documents: string;
    paginationAriaLabel: string;
    tableTab: string;
    pipelineTab: string;
    filterPlaceholder: string;
    errorTitle: string;
    errorMessage: string;
    saveButton: string;
    saveErrorTitle: string;
    saveErrorMessage: string;
    closeConfirmTitle: string;
    closeConfirmBody: string;
    closeConfirmCancel: string;
    closeConfirmDiscard: string;
    invalidJsonError: (reason: string) => string;
}>;
export declare const STATUS_LABELS: Readonly<{
    analyzing: string;
    success: string;
    failed: string;
    cancelled: string;
    approved: string;
    deleting: string;
}>;
export declare const ARIA_LABELS: Readonly<{
    uploadLogFile: string;
    selectIndex: string;
}>;
