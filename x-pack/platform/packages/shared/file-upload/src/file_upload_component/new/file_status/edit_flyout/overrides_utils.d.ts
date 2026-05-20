export declare const LINES_TO_SAMPLE_VALUE_MIN = 3;
export declare const LINES_TO_SAMPLE_VALUE_MAX = 1000000;
export declare function convertDelimiter(d: string): {
    delimiter: string;
    customDelimiter?: undefined;
} | {
    delimiter: string;
    customDelimiter: string;
};
export declare function convertDelimiterBack(delimiter: string, customDelimiter: string): string | undefined;
export declare function getColumnNames(columnNames: string | undefined, originalSettings: any): {
    newColumnNames: string | any[] | undefined;
    originalColumnNames: any[];
};
export declare function getGrokFieldNames(grokPattern: string, originalGrokPattern: string): string[];
export declare function isLinesToSampleValid(linesToSample: number): boolean;
