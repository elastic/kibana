import type { SingleCaseMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';
export declare class IsolateHostActions implements AggregationBuilder<SingleCaseMetricsResponse> {
    private readonly uniqueValuesLimit;
    constructor(uniqueValuesLimit?: number);
    build(): {
        actions: {
            terms: {
                field: string;
                size: number;
            };
        };
    };
    formatResponse(aggregationsResponse: AggregationResponse): {
        actions: {
            isolateHost: {
                isolate: {
                    total: number;
                };
                unisolate: {
                    total: number;
                };
            };
        };
    };
    getName(): string;
}
