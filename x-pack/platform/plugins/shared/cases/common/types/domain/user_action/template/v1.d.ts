import * as rt from 'io-ts';
export declare const TemplateUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    template: rt.UnionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        version: rt.NumberC;
    }>>, rt.NullC]>;
}>>;
export declare const TemplateUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"template">;
    payload: rt.ExactC<rt.TypeC<{
        template: rt.UnionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>, rt.NullC]>;
    }>>;
}>>;
