/**
 * React-query cache keys for the signal rule overview (firing-frequency
 * histogram + KPIs). Kept separate from `ruleOverviewQueryKeys`, which is
 * scoped to the episode/alert timeline.
 */
export declare const signalOverviewQueryKeys: {
    all: readonly ["alerting-v2", "signal-overview"];
    firingsHistogram: (ruleId: string, gteMs: number, lteMs: number, interval: string) => readonly ["alerting-v2", "signal-overview", "firings-histogram", string, number, number, string];
    firingsSummary: (ruleId: string, gteMs: number, lteMs: number) => readonly ["alerting-v2", "signal-overview", "firings-summary", string, number, number];
};
