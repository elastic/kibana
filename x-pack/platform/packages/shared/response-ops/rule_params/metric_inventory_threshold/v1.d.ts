import type { Type } from '@kbn/config-schema';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { TimeUnitChar } from '../common/utils';
export declare const metricInventoryThresholdRuleParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: Type<Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
        customMetric?: Readonly<{
            label?: string | undefined;
        } & {
            type: "custom";
            id: string;
            field: string;
            aggregation: "avg" | "max" | "min" | "rate";
        }> | undefined;
    } & {
        threshold: number[];
        comparator: COMPARATORS;
        timeUnit: TimeUnitChar;
        timeSize: number;
        metric: "avg" | "max" | "min" | "rate";
    }>[]>;
    nodeType: Type<string>;
    filterQuery: Type<string | undefined>;
    sourceId: Type<string>;
    alertOnNoData: Type<boolean | undefined>;
    schema: Type<string | undefined>;
}>;
