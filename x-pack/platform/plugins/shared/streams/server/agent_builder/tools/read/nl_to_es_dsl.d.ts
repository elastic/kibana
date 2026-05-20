import type { BoundInferenceClient } from '@kbn/inference-common';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
interface TranslatedSearchParams {
    query?: SearchRequest['query'];
    aggs?: SearchRequest['aggs'];
    sort?: SearchRequest['sort'];
    size?: number;
    _warning?: string;
}
export declare const extractJson: (text: string) => string;
export declare const translateNlToEsDsl: ({ nlQuery, inferenceClient, availableFields, }: {
    nlQuery: string;
    inferenceClient: BoundInferenceClient;
    availableFields: string;
}) => Promise<TranslatedSearchParams>;
export {};
