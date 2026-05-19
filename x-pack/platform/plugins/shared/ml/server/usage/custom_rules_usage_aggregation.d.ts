export interface MlCustomRulesUsage {
    total_count: number;
    jobs_with_rules_count: number;
    detectors_with_rules_count: number;
    count_by_action: {
        skip_result: number;
        skip_model_update: number;
    };
    count_with_conditions: number;
    count_with_scope: number;
}
export declare const emptyCustomRulesUsage: () => MlCustomRulesUsage;
export declare function aggregateCustomRulesUsageFromJobs(jobs: ReadonlyArray<{
    analysis_config?: {
        detectors?: ReadonlyArray<{
            custom_rules?: ReadonlyArray<{
                actions?: ReadonlyArray<string>;
                conditions?: ReadonlyArray<unknown>;
                scope?: Record<string, unknown>;
            }>;
        }>;
    };
}>): MlCustomRulesUsage;
