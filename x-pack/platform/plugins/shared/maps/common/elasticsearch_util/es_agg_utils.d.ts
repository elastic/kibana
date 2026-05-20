import type { DataView, DataViewField } from '@kbn/data-plugin/common';
export type BucketProperties = Record<string | number, unknown>;
export type PropertiesMap = Map<string, BucketProperties>;
export declare function getField(indexPattern: DataView, fieldName: string): DataViewField;
export declare function addFieldToDSL(dsl: object, field: DataViewField): {
    field: string;
    script?: undefined;
} | {
    script: {
        source: string | undefined;
        lang: string | undefined;
    };
    field?: undefined;
};
export declare function extractPropertiesFromBucket(bucket: any, ignoreKeys?: string[]): BucketProperties;
