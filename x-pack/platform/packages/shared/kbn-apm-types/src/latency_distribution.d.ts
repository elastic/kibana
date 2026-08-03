export interface OverallLatencyDistributionResponse {
    durationMin?: number;
    durationMax?: number;
    totalDocCount?: number;
    percentileThresholdValue?: number | null;
    overallHistogram?: Array<{
        key: number;
        doc_count: number;
    }>;
}
