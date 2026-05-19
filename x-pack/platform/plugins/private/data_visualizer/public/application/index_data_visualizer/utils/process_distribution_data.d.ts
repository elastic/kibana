import type { Distribution } from '../../../../common/types/field_stats';
export declare const processDistributionData: (percentiles: Array<{
    value: number;
}>, percentileSpacing: number, minValue: number) => Distribution;
