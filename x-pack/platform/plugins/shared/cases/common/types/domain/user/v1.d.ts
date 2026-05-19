import * as rt from 'io-ts';
export declare const UserRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
}>>, rt.ExactC<rt.PartialC<{
    profile_uid: rt.StringC;
}>>]>;
export declare const UserWithProfileInfoRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    user: rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>;
}>>, rt.ExactC<rt.PartialC<{
    uid: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    avatar: rt.ExactC<rt.PartialC<{
        initials: rt.UnionC<[rt.StringC, rt.NullC]>;
        color: rt.UnionC<[rt.StringC, rt.NullC]>;
        imageUrl: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
}>>]>;
export declare const UsersRt: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
}>>, rt.ExactC<rt.PartialC<{
    profile_uid: rt.StringC;
}>>]>>;
export type User = rt.TypeOf<typeof UserRt>;
export type UserWithProfileInfo = rt.TypeOf<typeof UserWithProfileInfoRt>;
export declare const CaseUserProfileRt: rt.ExactC<rt.TypeC<{
    uid: rt.StringC;
}>>;
export type CaseUserProfile = rt.TypeOf<typeof CaseUserProfileRt>;
/**
 * Assignees
 */
export declare const CaseAssigneesRt: rt.ArrayC<rt.ExactC<rt.TypeC<{
    uid: rt.StringC;
}>>>;
export type CaseAssignees = rt.TypeOf<typeof CaseAssigneesRt>;
