import * as rt from 'io-ts';
export declare const AssigneesUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    assignees: rt.ArrayC<rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        uid: rt.StringC;
    }>, rt.PartialC<{
        username: rt.UnionC<[rt.StringC, rt.NullC]>;
        full_name: rt.UnionC<[rt.StringC, rt.NullC]>;
        email: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>]>>>;
}>>;
export declare const AssigneesUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"assignees">;
    payload: rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.IntersectionC<[rt.TypeC<{
            uid: rt.StringC;
        }>, rt.PartialC<{
            username: rt.UnionC<[rt.StringC, rt.NullC]>;
            full_name: rt.UnionC<[rt.StringC, rt.NullC]>;
            email: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>]>>>;
    }>>;
}>>;
