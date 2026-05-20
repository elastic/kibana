import * as rt from 'io-ts';
export declare const DescriptionUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    description: rt.StringC;
}>>;
export declare const DescriptionUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"description">;
    payload: rt.ExactC<rt.TypeC<{
        description: rt.StringC;
    }>>;
}>>;
