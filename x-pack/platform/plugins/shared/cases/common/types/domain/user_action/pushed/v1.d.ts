import * as rt from 'io-ts';
export declare const PushedUserActionPayloadWithoutConnectorIdRt: rt.ExactC<rt.TypeC<{
    externalService: rt.ExactC<rt.TypeC<{
        connector_name: rt.StringC;
        external_id: rt.StringC;
        external_title: rt.StringC;
        external_url: rt.StringC;
        pushed_at: rt.StringC;
        pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
    }>>;
}>>;
export declare const PushedUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    externalService: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        connector_id: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        connector_name: rt.StringC;
        external_id: rt.StringC;
        external_title: rt.StringC;
        external_url: rt.StringC;
        pushed_at: rt.StringC;
        pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
    }>>]>;
}>>;
export declare const PushedUserActionWithoutConnectorIdRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"pushed">;
    payload: rt.ExactC<rt.TypeC<{
        externalService: rt.ExactC<rt.TypeC<{
            connector_name: rt.StringC;
            external_id: rt.StringC;
            external_title: rt.StringC;
            external_url: rt.StringC;
            pushed_at: rt.StringC;
            pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
        }>>;
    }>>;
}>>;
export declare const PushedUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"pushed">;
    payload: rt.ExactC<rt.TypeC<{
        externalService: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            connector_id: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            connector_name: rt.StringC;
            external_id: rt.StringC;
            external_title: rt.StringC;
            external_url: rt.StringC;
            pushed_at: rt.StringC;
            pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
        }>>]>;
    }>>;
}>>;
