import type { IScopedClusterClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { Annotation, Annotations } from '@kbn/ml-common-types/annotations';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
export interface IndexAnnotationArgs {
    jobIds: string[];
    earliestMs: number | null;
    latestMs: number | null;
    maxAnnotations: number;
    detectorIndex?: number;
    entities?: any[];
    event?: Annotation['event'];
}
export interface GetResponse {
    success: true;
    annotations: Record<JobId, Annotations>;
    totalCount: number;
}
export interface IndexParams {
    index: string;
    body: Annotation;
    refresh: boolean | 'wait_for' | undefined;
    require_alias?: boolean;
    id?: string;
}
export interface DeleteParams {
    index: string;
    refresh: boolean | 'wait_for' | undefined;
    id: string;
}
export interface AggByJob {
    key: string;
    doc_count: number;
    latest_delayed: Pick<estypes.SearchResponse<Annotation>, 'hits'>;
}
export declare function annotationProvider({ asInternalUser }: IScopedClusterClient): {
    getAnnotations: ({ jobIds, earliestMs, latestMs, maxAnnotations, detectorIndex, entities, event, }: IndexAnnotationArgs) => Promise<GetResponse>;
    indexAnnotation: (annotation: Annotation, username: string) => Promise<estypes.WriteResponseBase>;
    deleteAnnotation: (id: string) => Promise<estypes.WriteResponseBase>;
    getDelayedDataAnnotations: ({ jobIds, earliestMs, }: {
        jobIds: string[];
        earliestMs?: number;
    }) => Promise<Annotation[]>;
};
export type AnnotationService = ReturnType<typeof annotationProvider>;
