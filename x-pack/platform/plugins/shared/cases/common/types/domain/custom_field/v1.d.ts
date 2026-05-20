import * as rt from 'io-ts';
export declare enum CustomFieldTypes {
    TEXT = "text",
    TOGGLE = "toggle",
    NUMBER = "number"
}
export declare const CustomFieldTextTypeRt: rt.LiteralC<CustomFieldTypes.TEXT>;
export declare const CustomFieldToggleTypeRt: rt.LiteralC<CustomFieldTypes.TOGGLE>;
export declare const CustomFieldNumberTypeRt: rt.LiteralC<CustomFieldTypes.NUMBER>;
declare const CaseCustomFieldTextRt: rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.TEXT>;
    value: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export declare const CaseCustomFieldToggleRt: rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.TOGGLE>;
    value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>;
export declare const CaseCustomFieldNumberRt: rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.NUMBER>;
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>;
export declare const CaseCustomFieldRt: rt.UnionC<[rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.TEXT>;
    value: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.TOGGLE>;
    value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.NUMBER>;
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>]>;
export declare const CaseCustomFieldsRt: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.TEXT>;
    value: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.TOGGLE>;
    value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<CustomFieldTypes.NUMBER>;
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>]>>;
export type CaseCustomFields = rt.TypeOf<typeof CaseCustomFieldsRt>;
export type CaseCustomField = rt.TypeOf<typeof CaseCustomFieldRt>;
export type CaseCustomFieldToggle = rt.TypeOf<typeof CaseCustomFieldToggleRt>;
export type CaseCustomFieldText = rt.TypeOf<typeof CaseCustomFieldTextRt>;
export type CaseCustomFieldNumber = rt.TypeOf<typeof CaseCustomFieldNumberRt>;
export {};
