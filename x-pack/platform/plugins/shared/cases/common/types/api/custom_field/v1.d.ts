import * as rt from 'io-ts';
export declare const CaseCustomFieldTextWithValidationValueRt: (fieldName: string) => rt.Type<string, string, unknown>;
export declare const CaseCustomFieldNumberWithValidationValueRt: ({ fieldName }: {
    fieldName: string;
}) => rt.Type<number, number, unknown>;
/**
 * Update custom_field
 */
export declare const CustomFieldPutRequestRt: rt.ExactC<rt.TypeC<{
    value: rt.UnionC<[rt.BooleanC, rt.NullC, rt.Type<string, string, unknown>, rt.Type<number, number, unknown>]>;
    caseVersion: rt.StringC;
}>>;
export type CustomFieldPutRequest = rt.TypeOf<typeof CustomFieldPutRequestRt>;
