import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { DocumentAnalysis } from './document_analysis';
export declare function mergeSampleDocumentsWithSchema({ total, hits, schema, }: {
    total: number;
    hits: SearchHit[];
    schema: Array<{
        name: string;
        types: string[];
    }>;
}): DocumentAnalysis;
