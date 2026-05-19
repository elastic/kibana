import type { AttachmentUIV2, UserActionUI } from '../../containers/types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
interface LastPageUserActions {
    userActivityQueryParams: UserActivityParams;
    caseId: string;
    lastPage: number;
}
export declare const useLastPageUserActions: ({ userActivityQueryParams, caseId, lastPage, }: LastPageUserActions) => {
    isLoadingLastPageUserActions: boolean;
    lastPageUserActions: UserActionUI[];
    lastPageAttachments: AttachmentUIV2[];
};
export {};
