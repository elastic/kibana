import type { ServerError } from '../types';
export declare const useGetCaseUsers: (caseId: string) => import("@kbn/react-query").UseQueryResult<{
    assignees: ({
        user: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        };
    } & {
        uid?: string | undefined;
    } & {
        avatar?: {
            initials?: string | null | undefined;
            color?: string | null | undefined;
            imageUrl?: string | null | undefined;
        } | undefined;
    })[];
    unassignedUsers: ({
        user: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        };
    } & {
        uid?: string | undefined;
    } & {
        avatar?: {
            initials?: string | null | undefined;
            color?: string | null | undefined;
            imageUrl?: string | null | undefined;
        } | undefined;
    })[];
    participants: ({
        user: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        };
    } & {
        uid?: string | undefined;
    } & {
        avatar?: {
            initials?: string | null | undefined;
            color?: string | null | undefined;
            imageUrl?: string | null | undefined;
        } | undefined;
    })[];
    reporter: {
        user: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        };
    } & {
        uid?: string | undefined;
    } & {
        avatar?: {
            initials?: string | null | undefined;
            color?: string | null | undefined;
            imageUrl?: string | null | undefined;
        } | undefined;
    };
}, ServerError>;
export type UseGetCaseUsers = ReturnType<typeof useGetCaseUsers>;
