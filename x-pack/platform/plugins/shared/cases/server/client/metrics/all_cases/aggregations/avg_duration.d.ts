import type { CasesMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';
export declare class AverageDuration implements AggregationBuilder<CasesMetricsResponse> {
    build(): {
        mttr: {
            avg: {
                field: string;
            };
        };
    };
    formatResponse(aggregations: AggregationResponse): {
        mttr: number | null;
    };
    getName(): string;
}
