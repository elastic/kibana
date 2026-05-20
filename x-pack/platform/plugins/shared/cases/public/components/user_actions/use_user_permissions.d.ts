import type { UserActivityParams } from '../user_actions_activity_bar/types';
export declare const useUserPermissions: () => {
    getCanAddUserComments: (userActivityQueryParams: UserActivityParams) => boolean;
    canReopenCase: boolean;
    canUpdate: boolean;
};
