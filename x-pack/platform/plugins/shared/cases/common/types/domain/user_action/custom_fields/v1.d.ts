import * as rt from 'io-ts';
export declare const CustomFieldsUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../custom_field/v1").CustomFieldTypes.TEXT>;
        value: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../custom_field/v1").CustomFieldTypes.TOGGLE>;
        value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../custom_field/v1").CustomFieldTypes.NUMBER>;
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>>;
}>>;
export declare const CustomFieldsUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"customFields">;
    payload: rt.ExactC<rt.TypeC<{
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../custom_field/v1").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../custom_field/v1").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../custom_field/v1").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>;
}>>;
