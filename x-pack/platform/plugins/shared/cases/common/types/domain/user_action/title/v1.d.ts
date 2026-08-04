import * as rt from 'io-ts';
export declare const TitleUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    title: rt.StringC;
}>>;
export declare const TitleUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"title">;
    payload: rt.ExactC<rt.TypeC<{
        title: rt.StringC;
    }>>;
}>>;
