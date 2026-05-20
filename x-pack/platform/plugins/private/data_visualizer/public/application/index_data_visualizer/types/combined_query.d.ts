import type { Query } from '@kbn/es-query';
export interface CombinedQuery {
    searchString: Query['query'];
    searchQueryLanguage: string;
}
export interface ErrorMessage {
    query: string;
    message: string;
}
