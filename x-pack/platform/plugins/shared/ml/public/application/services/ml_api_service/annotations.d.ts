import type { Annotation, GetAnnotationsResponse } from '@kbn/ml-common-types/annotations';
import type { HttpService } from '../http_service';
export declare const annotationsApiProvider: (httpService: HttpService) => {
    getAnnotations$(obj: {
        jobIds: string[];
        earliestMs: number;
        latestMs: number;
        maxAnnotations: number;
        detectorIndex?: number;
        entities?: any[];
    }): import("rxjs").Observable<GetAnnotationsResponse>;
    getAnnotations(obj: {
        jobIds: string[];
        earliestMs: number | null;
        latestMs: number | null;
        maxAnnotations: number;
        detectorIndex?: number;
        entities?: any[];
    }): Promise<GetAnnotationsResponse>;
    indexAnnotation(obj: Annotation): Promise<any>;
    deleteAnnotation(id: string): Promise<any>;
};
export type AnnotationsApiService = ReturnType<typeof annotationsApiProvider>;
/**
 * Hooks for accessing {@link AnnotationsApiService} in React components.
 */
export declare function useAnnotationsApiService(): AnnotationsApiService;
