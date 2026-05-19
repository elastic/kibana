import type { Type } from '@kbn/config-schema';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { TimeUnitChar } from '../common/utils';
export declare const metricInventoryThresholdRuleParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: Type<Readonly<{
        customMetric?: Readonly<{
            label?: string | undefined;
        } & {
            id: string;
            type: "custom";
            field: string;
            aggregation: "min" | "max" | "avg" | "rate";
        }> | undefined;
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        threshold: number[];
        metric: "min" | "max" | "avg" | "rate";
        comparator: COMPARATORS;
        timeUnit: TimeUnitChar;
        timeSize: number;
    }>[]>;
    nodeType: Type<string>;
    filterQuery: Type<string | undefined>;
    sourceId: Type<string>;
    alertOnNoData: Type<boolean | undefined>;
    schema: Type<string | undefined>;
}>;
