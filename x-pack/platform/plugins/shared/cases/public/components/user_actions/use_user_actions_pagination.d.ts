import type { AttachmentUIV2, UserActionUI } from '../../containers/types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
interface UserActionsPagination {
    userActivityQueryParams: UserActivityParams;
    caseId: string;
    lastPage: number;
}
export declare const useUserActionsPagination: ({ userActivityQueryParams, caseId, lastPage, }: UserActionsPagination) => {
    lastPage: number;
    showBottomList: boolean;
    isLoadingInfiniteUserActions: boolean;
    infiniteCaseUserActions: UserActionUI[];
    infiniteLatestAttachments: AttachmentUIV2[];
    hasNextPage: boolean | undefined;
    fetchNextPage: (options?: import("@tanstack/query-core").FetchNextPageOptions) => Promise<import("@tanstack/query-core").InfiniteQueryObserverResult<import("../../containers/types").InternalFindCaseUserActions, import("../../types").ServerError>>;
    isFetchingNextPage: boolean;
};
export {};
