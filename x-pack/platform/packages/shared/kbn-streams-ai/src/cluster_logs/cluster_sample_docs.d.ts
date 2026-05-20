import type { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { FormattedDocumentAnalysis } from '@kbn/ai-tools';
interface ClusterDocsResponse {
    sampled: number;
    noise: number[];
    clusters: Array<{
        count: number;
        samples: SearchHit[];
        analysis: FormattedDocumentAnalysis;
    }>;
}
export declare function clusterSampleDocs({ hits, fieldCaps, dropUnmapped, valueCardinalityLimit, }: {
    hits: SearchHit[];
    fieldCaps: FieldCapsResponse;
    dropUnmapped?: boolean;
    valueCardinalityLimit?: number;
}): ClusterDocsResponse;
export {};
