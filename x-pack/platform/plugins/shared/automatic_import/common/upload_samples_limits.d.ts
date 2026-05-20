/**
 * Maximum number of log lines in a single upload request.
 */
export declare const UPLOAD_SAMPLES_MAX_LINES = 1000;
export interface NormalizeLogSamplesResult {
    samples: string[];
    linesOmittedOverLimit: number;
}
export declare function normalizeLogSamplesFromFileContent(content: string): NormalizeLogSamplesResult;
export declare function normalizeLogLinesForUpload(lines: readonly string[]): NormalizeLogSamplesResult;
