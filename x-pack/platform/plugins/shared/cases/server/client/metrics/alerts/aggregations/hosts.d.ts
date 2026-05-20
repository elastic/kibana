import type { estypes } from '@elastic/elasticsearch';
import type { SingleCaseMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';
export declare class AlertHosts implements AggregationBuilder<SingleCaseMetricsResponse> {
    private readonly uniqueValuesLimit;
    constructor(uniqueValuesLimit?: number);
    build(): Record<string, estypes.AggregationsAggregationContainer>;
    formatResponse(aggregations: AggregationResponse): {
        alerts: {
            hosts: {
                total: number;
                values: {
                    name: any;
                    id: string;
                    count: number;
                }[];
            };
        };
    };
    private static getHostName;
    getName(): string;
}
