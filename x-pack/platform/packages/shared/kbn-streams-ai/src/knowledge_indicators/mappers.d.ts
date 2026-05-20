import type { Feature, QueryLink } from '@kbn/streams-schema';
import type { KnowledgeIndicatorFeature, KnowledgeIndicatorQuery } from './types';
export declare const featureToKnowledgeIndicatorFeature: (feature: Feature) => KnowledgeIndicatorFeature;
export declare const queryLinkToKnowledgeIndicatorQuery: (queryLink: QueryLink) => KnowledgeIndicatorQuery;
