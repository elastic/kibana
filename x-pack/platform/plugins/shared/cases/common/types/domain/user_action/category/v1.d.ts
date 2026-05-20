import * as rt from 'io-ts';
export declare const CategoryUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export declare const CategoryUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"category">;
    payload: rt.ExactC<rt.TypeC<{
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
}>>;
