export declare const anomalyDetectionJobsHealthRuleParamsSchema: import("@kbn/config-schema").ObjectType<{
    includeJobs: import("@kbn/config-schema").ObjectType<{
        jobIds: import("@kbn/config-schema").Type<string[]>;
        groupIds: import("@kbn/config-schema").Type<string[]>;
    }>;
    excludeJobs: import("@kbn/config-schema").Type<Readonly<{} & {
        groupIds: string[];
        jobIds: string[];
    }> | null>;
    testsConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        errorMessages: Readonly<{} & {
            enabled: boolean;
        }> | null;
        datafeed: Readonly<{} & {
            enabled: boolean;
        }> | null;
        mml: Readonly<{} & {
            enabled: boolean;
        }> | null;
        delayedData: Readonly<{
            thresholdType?: "count" | "percentage" | undefined;
        } & {
            enabled: boolean;
            timeInterval: string | null;
            docsCount: number | null;
            docsCountPercentage: number | null;
        }> | null;
        behindRealtime: Readonly<{} & {
            enabled: boolean;
            timeInterval: string | null;
        }> | null;
    }> | null>;
}>;
