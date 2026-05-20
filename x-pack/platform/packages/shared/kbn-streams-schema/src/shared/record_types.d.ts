import type { z } from '@kbn/zod/v4';
export type Primitive = string | number | boolean | null | undefined;
export declare const primitive: z.ZodType<Primitive>;
export interface RecursiveRecord {
    [key: PropertyKey]: Primitive | Primitive[] | unknown[] | RecursiveRecord;
}
export declare const recursiveRecord: z.ZodType<RecursiveRecord>;
export type FlattenRecord = Record<PropertyKey, Primitive | Primitive[] | unknown[]>;
export declare const flattenRecord: z.ZodType<FlattenRecord>;
export declare const sampleDocument: z.ZodType<RecursiveRecord, unknown, z.core.$ZodTypeInternals<RecursiveRecord, unknown>>;
export type SampleDocument = RecursiveRecord;
export interface IgnoredField {
    field: string;
}
export interface DocumentWithIgnoredFields {
    values?: SampleDocument;
    ignored_fields: IgnoredField[];
}
