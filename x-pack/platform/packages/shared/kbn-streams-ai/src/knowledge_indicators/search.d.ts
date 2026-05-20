import type { Feature, QueryLink } from '@kbn/streams-schema';
import type { SearchKnowledgeIndicatorsInput, SearchKnowledgeIndicatorsOutput } from './types';
export declare const DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_LIMIT = 20;
export declare function searchKnowledgeIndicators({ getStreamNames, getFeatures, getQueries, onFeatureFetchError, params, }: {
    getStreamNames(): Promise<string[]>;
    getFeatures(streamName: string, options: {
        searchText?: string;
        limit?: number;
    }): Promise<Feature[]>;
    getQueries(streamNames: string[], search_text?: string): Promise<QueryLink[]>;
    onFeatureFetchError?: (streamName: string, error: unknown) => void;
    params: SearchKnowledgeIndicatorsInput;
}): Promise<SearchKnowledgeIndicatorsOutput>;
