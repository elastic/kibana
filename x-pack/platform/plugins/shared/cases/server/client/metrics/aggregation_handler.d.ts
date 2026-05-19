import type { CaseMetricsFeature } from '../../../common/types/api';
import { BaseHandler } from './base_handler';
import type { AggregationBuilder, AggregationResponse, BaseHandlerCommonOptions } from './types';
export declare abstract class AggregationHandler<R> extends BaseHandler<R> {
    protected readonly aggregations: Map<string, AggregationBuilder<R>>;
    protected aggregationBuilders: Array<AggregationBuilder<R>>;
    constructor(options: BaseHandlerCommonOptions, aggregations: Map<string, AggregationBuilder<R>>);
    getFeatures(): Set<CaseMetricsFeature>;
    setupFeature(feature: CaseMetricsFeature): void;
    formatResponse<F>(aggregationsResponse?: AggregationResponse): F;
}
