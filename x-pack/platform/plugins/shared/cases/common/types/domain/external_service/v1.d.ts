import * as rt from 'io-ts';
/**
 * This represents the push to service UserAction. It lacks the connector_id because that is stored in a different field
 * within the user action object in the API response.
 */
export declare const ExternalServiceBasicRt: rt.ExactC<rt.TypeC<{
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
export declare const ExternalServiceRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
export type ExternalService = rt.TypeOf<typeof ExternalServiceRt>;
