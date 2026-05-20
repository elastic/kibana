import type { SingleCaseMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';
export declare class AlertUsers implements AggregationBuilder<SingleCaseMetricsResponse> {
    private readonly uniqueValuesLimit;
    constructor(uniqueValuesLimit?: number);
    build(): {
        users_frequency: {
            terms: {
                field: string;
                size: number;
            };
        };
        users_total: {
            cardinality: {
                field: string;
            };
        };
    };
    formatResponse(aggregations: AggregationResponse): {
        alerts: {
            users: {
                total: number;
                values: {
                    name: string;
                    count: number;
                }[];
            };
        };
    };
    getName(): string;
}
