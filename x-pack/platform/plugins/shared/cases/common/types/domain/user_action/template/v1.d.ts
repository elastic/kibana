import * as rt from 'io-ts';
export declare const TemplateUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    template: rt.UnionC<[rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        version: rt.NumberC;
    }>, rt.PartialC<{
        name: rt.StringC;
    }>]>>, rt.NullC]>;
}>>;
export declare const TemplateUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"template">;
    payload: rt.ExactC<rt.TypeC<{
        template: rt.UnionC<[rt.ExactC<rt.IntersectionC<[rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>, rt.PartialC<{
            name: rt.StringC;
        }>]>>, rt.NullC]>;
    }>>;
}>>;
