import type { CasesMetricsFeatureField } from '../../../common/types/api';
import type { BaseHandlerCommonOptions, MetricsHandler } from './types';
export declare abstract class BaseHandler<R> implements MetricsHandler<R> {
    protected readonly options: BaseHandlerCommonOptions;
    private readonly features?;
    constructor(options: BaseHandlerCommonOptions, features?: CasesMetricsFeatureField[] | undefined);
    getFeatures(): Set<CasesMetricsFeatureField>;
    abstract compute(): Promise<R>;
}
