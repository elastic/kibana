import type { MlApi } from '../../../../services/ml_api_service';
interface SplitFieldWithValue {
    name: string;
    value: string;
}
type TimeStamp = number;
interface Result {
    time: TimeStamp;
    value: unknown;
}
interface ProcessedResults {
    success: boolean;
    results: Record<number, Result[]>;
    totalResults: number;
}
export declare function getScoresByRecord(mlApi: MlApi, jobId: string, earliestMs: number, latestMs: number, intervalMs: number, firstSplitField: SplitFieldWithValue | null): Promise<ProcessedResults>;
export {};
