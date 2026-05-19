import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
export declare const getGroupingModeLabel: (mode: GroupingMode | null | undefined) => string;
export declare const getThrottleStrategyLabel: (strategy: ThrottleStrategy | null | undefined, mode: GroupingMode | null | undefined) => string;
