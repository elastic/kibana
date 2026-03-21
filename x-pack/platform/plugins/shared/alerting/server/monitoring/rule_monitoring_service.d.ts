import type { RuleMonitoring, PublicRuleMonitoringService } from '../types';
export declare class RuleMonitoringService {
    private monitoring;
    setLastRunMetricsDuration(duration: number): void;
    setMonitoring(monitoringFromSO: RuleMonitoring | undefined): void;
    getMonitoring(): RuleMonitoring;
    addHistory({ duration, hasError, runDate, }: {
        duration: number | undefined;
        hasError: boolean;
        runDate: Date;
    }): void;
    getLastRunMetricsSetters(): PublicRuleMonitoringService;
    private setLastRunMetricsTotalSearchDurationMs;
    private setLastRunMetricsTotalIndexingDurationMs;
    private setLastRunMetricsTotalAlertsDetected;
    private setLastRunMetricsTotalAlertsCreated;
    private setLastRunMetricsGapDurationS;
    private setLastRunMetricsGapRange;
    private buildExecutionSuccessRatio;
    private buildExecutionDurationPercentiles;
}
