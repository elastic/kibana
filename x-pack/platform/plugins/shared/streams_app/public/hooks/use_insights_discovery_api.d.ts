export declare function useInsightsDiscoveryApi(connectorId?: string): {
    scheduleInsightsDiscoveryTask: (streamNames?: string[]) => Promise<void>;
    getInsightsDiscoveryTaskStatus: () => Promise<import("../../../streams/server/routes/internal/streams/insights/route").InsightsTaskResult>;
    cancelInsightsDiscoveryTask: () => Promise<import("../../../streams/server/routes/internal/streams/insights/route").InsightsTaskResult>;
    acknowledgeInsightsDiscoveryTask: () => Promise<import("../../../streams/server/routes/internal/streams/insights/route").InsightsTaskResult>;
};
