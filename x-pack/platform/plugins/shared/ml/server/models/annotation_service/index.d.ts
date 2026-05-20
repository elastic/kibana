import type { IScopedClusterClient } from '@kbn/core/server';
export declare function annotationServiceProvider(client: IScopedClusterClient): {
    getAnnotations: ({ jobIds, earliestMs, latestMs, maxAnnotations, detectorIndex, entities, event, }: import("./annotation").IndexAnnotationArgs) => Promise<import("./annotation").GetResponse>;
    indexAnnotation: (annotation: import("@kbn/ml-common-types/annotations").Annotation, username: string) => Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
    deleteAnnotation: (id: string) => Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
    getDelayedDataAnnotations: ({ jobIds, earliestMs, }: {
        jobIds: string[];
        earliestMs?: number;
    }) => Promise<import("@kbn/ml-common-types/annotations").Annotation[]>;
};
