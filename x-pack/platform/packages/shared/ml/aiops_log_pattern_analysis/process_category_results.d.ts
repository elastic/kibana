import type { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import type { Category, CatResponse } from './types';
export declare function processCategoryResults(result: CatResponse, field: string, unwrap: ReturnType<typeof createRandomSamplerWrapper>['unwrap']): {
    categories: Category[];
    hasExamples: boolean;
};
