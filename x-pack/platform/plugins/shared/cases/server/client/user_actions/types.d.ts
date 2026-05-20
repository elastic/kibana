import type { UserActionFindRequest } from '../../../common/types/api';
/**
 * Parameters for retrieving user actions for a particular case
 */
export interface UserActionGet {
    /**
     * The ID of the case
     */
    caseId: string;
}
export type GetConnectorsRequest = UserActionGet;
export type GetUsersRequest = UserActionGet;
export interface UserActionFind {
    params: UserActionFindRequest;
    caseId: string;
}
