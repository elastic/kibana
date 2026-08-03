export declare const CANCEL: string;
export declare const CANCEL_ERROR: string;
export declare const datasetCounts: (values: {
    done: number;
    total: number | string;
    failed: number;
    scores: number;
}) => string;
export declare const viewFailures: (count: number) => string;
export declare const loadError: (id: string) => string;
export declare const stepFailed: (stepId: string) => string;
