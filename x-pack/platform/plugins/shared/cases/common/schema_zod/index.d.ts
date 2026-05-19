import { z } from '@kbn/zod/v4';
export interface LimitedSchemaType {
    fieldName: string;
    min: number;
    max: number;
}
export declare const NonEmptyString: z.ZodString;
export declare const limitedStringSchema: ({ fieldName, min, max }: LimitedSchemaType) => z.ZodString;
export declare const limitedArraySchema: <T extends z.ZodTypeAny>({ codec, fieldName, min, max, }: {
    codec: T;
} & LimitedSchemaType) => z.ZodArray<T>;
export declare const limitedNumberSchema: ({ fieldName, min, max }: LimitedSchemaType) => z.ZodNumber;
export declare const paginationSchema: ({ maxPerPage }: {
    maxPerPage: number;
}) => z.ZodObject<{
    page: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>>;
    perPage: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>>;
}, z.core.$strip>;
export declare const limitedNumberAsIntegerSchema: ({ fieldName }: {
    fieldName: string;
}) => z.ZodNumber;
export declare const regexStringSchema: ({ codec, pattern, message, }: {
    codec: z.ZodType<string>;
    pattern: string;
    message: string;
}) => z.ZodType<string, unknown, z.core.$ZodTypeInternals<string, unknown>>;
export declare const mimeTypeString: z.ZodString;
/**
 * Zod equivalent of jsonValueRt — a recursive JSON value type.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export declare const jsonValueSchema: z.ZodType<JsonValue>;
