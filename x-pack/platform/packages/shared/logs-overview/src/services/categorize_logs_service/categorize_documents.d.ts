import type { ISearchGeneric } from '@kbn/search-types';
import type { LogCategorizationParams } from './types';
import type { LogCategory } from '../../types';
export declare const categorizeDocuments: ({ search }: {
    search: ISearchGeneric;
}) => import("xstate").PromiseActorLogic<{
    categories: LogCategory[];
    hasReachedLimit: boolean;
}, LogCategorizationParams & {
    samplingProbability: number;
    ignoredCategoryTerms: string[];
    minDocsPerCategory: number;
}, import("xstate").EventObject>;
