import type { Observable } from 'rxjs';
import type { BehaviorSubject } from 'rxjs';
import type { Annotation } from '@kbn/ml-common-types/annotations';
export type AnnotationState = Annotation | null;
export declare const annotation$: BehaviorSubject<AnnotationState>;
export declare const annotationsRefresh$: BehaviorSubject<number>;
export declare const annotationsRefreshed: () => void;
export declare class AnnotationUpdatesService {
    private _annotation$;
    update$(): Observable<AnnotationState>;
    isAnnotationInitialized$(): Observable<AnnotationState>;
    setValue(annotation: AnnotationState): void;
}
