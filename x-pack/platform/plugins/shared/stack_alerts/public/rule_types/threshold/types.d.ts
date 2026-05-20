import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
export interface Comparator {
    text: string;
    value: string;
    requiredValues: number;
}
export interface AggregationType {
    text: string;
    fieldRequired: boolean;
    value: string;
    validNormalizedTypes: string[];
}
export interface GroupByType {
    text: string;
    sizeRequired: boolean;
    value: string;
    validNormalizedTypes: string[];
}
export interface IndexThresholdRuleParams extends RuleTypeParams {
    index: string | string[];
    timeField?: string;
    aggType: string;
    aggField?: string;
    groupBy?: string;
    termSize?: number;
    termField?: string | string[];
    thresholdComparator?: string;
    threshold: number[];
    timeWindowSize: number;
    timeWindowUnit: string;
    filterKuery?: string;
}
