import * as rt from 'io-ts';
export declare const ExtendedFieldsRt: rt.RecordC<rt.StringC, rt.StringC>;
export declare const ExtendedFieldsUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
}>>;
export declare const ExtendedFieldsUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"extended_fields">;
    payload: rt.ExactC<rt.TypeC<{
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>;
}>>;
