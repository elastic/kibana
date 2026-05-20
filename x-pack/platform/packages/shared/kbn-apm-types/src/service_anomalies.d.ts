export interface ServiceAnomaliesResponse {
    mlJobIds: string[];
    serviceAnomalies: Array<{
        serviceName: string;
        jobId: string;
        transactionType: string;
        actualValue: number;
        anomalyScore: number;
    }>;
}
