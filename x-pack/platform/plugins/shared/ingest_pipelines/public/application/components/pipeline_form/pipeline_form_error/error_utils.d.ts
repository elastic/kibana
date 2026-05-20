export interface PipelineError {
    reason: string;
    processorType?: string;
}
interface PipelineErrors {
    errors: PipelineError[];
}
export declare const toKnownError: (error: unknown) => PipelineErrors;
export {};
