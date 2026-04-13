import type { COMPARATORS } from '@kbn/alerting-comparators';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import React from 'react';
interface ChartOptions {
    interval?: string;
}
export interface RuleConditionChartProps {
    threshold: number[];
    comparator: COMPARATORS;
    timeSize?: number;
    timeUnit?: TimeUnitChar;
    dataView?: DataView;
    groupBy?: string | string[];
    timeRange: TimeRange;
    chartOptions?: ChartOptions;
}
export declare function RuleConditionChart({ threshold, comparator, timeSize, timeUnit, dataView, groupBy, timeRange, chartOptions: { interval }, }: RuleConditionChartProps): React.JSX.Element;
export default RuleConditionChart;
