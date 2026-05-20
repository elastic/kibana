export type LogLevel = 'error' | 'warning';
export type TimeRange = '5m' | '1h' | '1d' | '1w';
export type SortField = 'count' | 'lastSeen';
export interface ErrorPattern {
    key: string;
    pattern: string;
    docCount: number;
    firstSeen: string;
    lastSeen: string;
    exampleMessage: string;
    component: string | null;
}
export interface UseErrorPatternsResult {
    errorPatterns: ErrorPattern[];
    warningPatterns: ErrorPattern[];
    errorCount: number;
    warningCount: number;
    totalLogCount: number;
    isLoading: boolean;
    error?: Error;
}
export declare const useErrorPatterns: ({ serviceInstanceId, timeRange, }: {
    serviceInstanceId: string;
    timeRange: TimeRange;
}) => UseErrorPatternsResult;
