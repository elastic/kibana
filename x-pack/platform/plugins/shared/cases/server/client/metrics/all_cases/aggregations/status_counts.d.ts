import type { CasesMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';
export declare class StatusCounts implements AggregationBuilder<CasesMetricsResponse> {
    build(): {
        status: {
            terms: {
                field: string;
                size: number;
            };
        };
    };
    formatResponse(aggregations: AggregationResponse): {
        status: {
            open: number;
            inProgress: number;
            closed: number;
        };
    };
    getName(): string;
}
