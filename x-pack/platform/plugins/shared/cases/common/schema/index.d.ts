import * as rt from 'io-ts';
export interface LimitedSchemaType {
    fieldName: string;
    min: number;
    max: number;
}
export declare const NonEmptyString: rt.Type<string, string, unknown>;
export declare const limitedStringSchema: ({ fieldName, min, max }: LimitedSchemaType) => rt.Type<string, string, unknown>;
export declare const limitedArraySchema: <T extends rt.Mixed>({ codec, fieldName, min, max, }: {
    codec: T;
} & LimitedSchemaType) => rt.Type<rt.TypeOf<T>[], rt.TypeOf<T>[], unknown>;
export declare const paginationSchema: ({ maxPerPage }: {
    maxPerPage: number;
}) => rt.PartialType<undefined, Partial<import("./types").Pagination>, Partial<import("./types").Pagination>, unknown>;
export declare const limitedNumberSchema: ({ fieldName, min, max }: LimitedSchemaType) => rt.Type<number, number, unknown>;
export declare const limitedNumberAsIntegerSchema: ({ fieldName }: {
    fieldName: string;
}) => rt.Type<number, number, unknown>;
export interface RegexStringSchemaType {
    codec: rt.Type<string, string, unknown>;
    pattern: string;
    message: string;
}
export declare const regexStringRt: ({ codec, pattern, message }: RegexStringSchemaType) => rt.Type<string, string, unknown>;
export declare const mimeTypeString: rt.Type<string, string, unknown>;
