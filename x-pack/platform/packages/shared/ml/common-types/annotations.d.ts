import type { MlPartitionFieldsType } from '@kbn/ml-anomaly-utils';
export declare enum ANNOTATION_TYPE {
    ANNOTATION = "annotation",
    COMMENT = "comment"
}
export type AnnotationFieldName = 'partition_field_name' | 'over_field_name' | 'by_field_name';
export type AnnotationFieldValue = 'partition_field_value' | 'over_field_value' | 'by_field_value';
export declare function getAnnotationFieldName(fieldType: MlPartitionFieldsType): AnnotationFieldName;
export declare function getAnnotationFieldValue(fieldType: MlPartitionFieldsType): AnnotationFieldValue;
export interface Annotation {
    _id?: string;
    create_time?: number;
    create_username?: string;
    modified_time?: number;
    modified_username?: string;
    key?: string;
    timestamp: number;
    end_timestamp?: number;
    annotation: string;
    job_id: string;
    type: ANNOTATION_TYPE.ANNOTATION | ANNOTATION_TYPE.COMMENT;
    event?: 'user' | 'delayed_data' | 'model_snapshot_stored' | 'model_change' | 'categorization_status_change';
    detector_index?: number;
    partition_field_name?: string;
    partition_field_value?: string;
    over_field_name?: string;
    over_field_value?: string;
    by_field_name?: string;
    by_field_value?: string;
}
export declare function isAnnotation(arg: any): arg is Annotation;
export type Annotations = Annotation[];
export declare function isAnnotations(arg: any): arg is Annotations;
export interface GetAnnotationsResponse {
    totalCount: number;
    annotations: Record<string, Annotations>;
    error?: string;
    success: boolean;
}
export interface AnnotationsTable {
    annotationsData: Annotations;
    error?: string;
    totalCount?: number;
}
