export interface AwsMockStreamRow {
    readonly name: string;
    readonly parentName: string | null;
    readonly level: number;
    readonly isWiredRoot: boolean;
    readonly sourceCount: number;
    readonly processingStepCount: number;
    readonly routingStepCount: number;
    readonly destinationCount: number;
    readonly sourceTitle: string;
    readonly sourceLogoUrl: string;
    readonly docsPerSec: number;
    readonly docCount: number;
    readonly quality: 'good' | 'degraded' | 'poor';
    readonly histogramData: Array<{
        x: number;
        y: number;
    }>;
    readonly retentionDays: number;
}
export declare const MOCK_AWS_STREAMS_NOW: number;
export declare const MOCK_AWS_STREAMS_RANGE_MS: number;
export declare const makeAwsMockSpark: (rate: number, points?: number) => Array<{
    x: number;
    y: number;
}>;
