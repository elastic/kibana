import * as rt from 'io-ts';
export declare const TagsUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    tags: rt.ArrayC<rt.StringC>;
}>>;
export declare const TagsUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"tags">;
    payload: rt.ExactC<rt.TypeC<{
        tags: rt.ArrayC<rt.StringC>;
    }>>;
}>>;
