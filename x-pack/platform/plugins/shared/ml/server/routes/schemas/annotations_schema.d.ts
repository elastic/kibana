import type { Annotations } from '@kbn/ml-common-types/annotations';
import { ANNOTATION_TYPE } from '../../../common/constants/annotations';
export declare const indexAnnotationSchema: import("@kbn/config-schema").ObjectType<{
    timestamp: import("@kbn/config-schema").Type<number>;
    end_timestamp: import("@kbn/config-schema").Type<number>;
    annotation: import("@kbn/config-schema").Type<string>;
    job_id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<ANNOTATION_TYPE>;
    create_time: import("@kbn/config-schema").Type<number | undefined>;
    create_username: import("@kbn/config-schema").Type<string | undefined>;
    modified_time: import("@kbn/config-schema").Type<number | undefined>;
    modified_username: import("@kbn/config-schema").Type<string | undefined>;
    event: import("@kbn/config-schema").Type<"user" | "delayed_data" | "model_snapshot_stored" | "model_change" | "categorization_status_change" | undefined>;
    detector_index: import("@kbn/config-schema").Type<number | undefined>;
    partition_field_name: import("@kbn/config-schema").Type<string | undefined>;
    partition_field_value: import("@kbn/config-schema").Type<string | undefined>;
    over_field_name: import("@kbn/config-schema").Type<string | undefined>;
    over_field_value: import("@kbn/config-schema").Type<string | undefined>;
    by_field_name: import("@kbn/config-schema").Type<string | undefined>;
    by_field_value: import("@kbn/config-schema").Type<string | undefined>;
    /** Document id */
    _id: import("@kbn/config-schema").Type<string | undefined>;
    key: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const getAnnotationsSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    earliestMs: import("@kbn/config-schema").Type<number | null>;
    latestMs: import("@kbn/config-schema").Type<number | null>;
    maxAnnotations: import("@kbn/config-schema").Type<number>;
    /** Fields to find unique values for (e.g. events or created_by) */
    fields: import("@kbn/config-schema").Type<Readonly<{
        missing?: string | undefined;
    } & {
        field: string;
    }>[] | undefined>;
    detectorIndex: import("@kbn/config-schema").Type<number | undefined>;
    entities: import("@kbn/config-schema").Type<Readonly<{
        fieldName?: string | undefined;
        fieldType?: string | undefined;
        fieldValue?: string | undefined;
    } & {}>[] | undefined>;
}>;
export declare const annotationsResponseSchema: () => import("@kbn/config-schema").ObjectType<{
    success: import("@kbn/config-schema").Type<boolean>;
    annotations: import("@kbn/config-schema").Type<Record<string, Annotations>>;
    totalCount: import("@kbn/config-schema").Type<number>;
}>;
export declare const deleteAnnotationSchema: import("@kbn/config-schema").ObjectType<{
    annotationId: import("@kbn/config-schema").Type<string>;
}>;
