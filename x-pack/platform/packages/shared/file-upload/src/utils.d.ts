import type { AnalysisResult, FormattedOverrides, InputOverrides } from '@kbn/file-upload-common';
export declare const DEFAULT_LINES_TO_SAMPLE = 1000;
export declare function readFile(file: File): Promise<{
    fileContents: string;
    data: ArrayBuffer;
}>;
export declare function createUrlOverrides(overrides: InputOverrides, originalSettings: InputOverrides): FormattedOverrides;
export declare function processResults({ results, overrides }: AnalysisResult): {
    format: string;
    delimiter: string;
    timestampField: string | undefined;
    timestampFormat: string | undefined;
    quote: string;
    hasHeaderRow: boolean;
    shouldTrimFields: boolean | undefined;
    charset: string;
    columnNames: string[] | undefined;
    grokPattern: string | undefined;
    linesToSample: string | number;
};
export type ServerSettings = ReturnType<typeof processResults> | null;
export declare function isSupportedFormat(format: string): boolean;
