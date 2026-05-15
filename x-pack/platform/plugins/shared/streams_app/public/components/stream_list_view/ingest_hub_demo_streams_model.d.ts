export interface AwsMockStreamRow {
    name: string;
    parentName: string | null;
    level: number;
    docCount: number;
    quality: 'good' | 'degraded' | 'poor';
    histogramData: Array<{
        x: number;
        y: number;
    }>;
    isRootStream: boolean;
}
export declare const MOCK_AWS_STREAMS_NOW: number;
export declare const MOCK_AWS_STREAMS_RANGE_MS: number;
export declare const makeAwsMockSpark: (rate: number, points?: number) => Array<{
    x: number;
    y: number;
}>;
export declare const AWS_MOCK_STREAMS: AwsMockStreamRow[];
