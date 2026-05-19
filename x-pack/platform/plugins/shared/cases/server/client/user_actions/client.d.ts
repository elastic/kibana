import type { CaseUserActionsDeprecatedResponse, CaseUserActionStatsResponse, GetCaseConnectorsResponse, GetCaseUsersResponse, UserActionFindResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '../types';
import type { GetConnectorsRequest, UserActionFind, UserActionGet, GetUsersRequest } from './types';
import type { CasesClient } from '../client';
/**
 * API for interacting the actions performed by a user when interacting with the cases entities.
 */
export interface UserActionsSubClient {
    find(params: UserActionFind): Promise<UserActionFindResponse>;
    /**
     * Retrieves all user actions for a particular case.
     */
    getAll(params: UserActionGet): Promise<CaseUserActionsDeprecatedResponse>;
    /**
     * Retrieves all the connectors used within a given case
     */
    getConnectors(params: GetConnectorsRequest): Promise<GetCaseConnectorsResponse>;
    /**
     * Retrieves the total of comments and user actions in a given case
     */
    stats(params: UserActionGet): Promise<CaseUserActionStatsResponse>;
    /**
     * Retrieves all users participating in a case
     */
    getUsers(params: GetUsersRequest): Promise<GetCaseUsersResponse>;
}
/**
 * Creates an API object for interacting with the user action entities
 */
export declare const createUserActionsSubClient: (clientArgs: CasesClientArgs, casesClient: CasesClient) => UserActionsSubClient;
