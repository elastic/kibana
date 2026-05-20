import * as rt from 'io-ts';
export declare const GetCaseUsersResponseRt: rt.ExactC<rt.TypeC<{
    assignees: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    }>>]>>;
    unassignedUsers: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    }>>]>>;
    participants: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    }>>]>>;
    reporter: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>;
export type GetCaseUsersResponse = rt.TypeOf<typeof GetCaseUsersResponseRt>;
/**
 * User Profiles
 */
export declare const SuggestUserProfilesRequestRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    name: rt.StringC;
    owners: rt.ArrayC<rt.StringC>;
}>>, rt.ExactC<rt.PartialC<{
    size: rt.Type<number, number, unknown>;
}>>]>;
export type SuggestUserProfilesRequest = rt.TypeOf<typeof SuggestUserProfilesRequestRt>;
