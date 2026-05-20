import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { CaseUserActionDeprecatedResponse } from '../../../common/types/api';
import type { CaseConnectorActivity, CaseConnectorFields, GetUsersResponse, PushInfo, ServiceContext } from './types';
import { UserActionPersister } from './operations/create';
import { UserActionFinder } from './operations/find';
import type { UserActionSavedObjectTransformed } from '../../common/types/user_actions';
export declare class CaseUserActionService {
    private readonly context;
    private readonly _creator;
    private readonly _finder;
    constructor(context: ServiceContext);
    get creator(): UserActionPersister;
    get finder(): UserActionFinder;
    getConnectorFieldsBeforeLatestPush(caseId: string, pushes: PushInfo[]): Promise<CaseConnectorFields>;
    private static buildConnectorFieldsUsedInPushAggs;
    private createCaseConnectorFieldsUsedInPushes;
    getMostRecentUserAction(caseId: string, hasAdditionalUserActionsConnector?: boolean): Promise<UserActionSavedObjectTransformed | undefined>;
    getCaseConnectorInformation(caseId: string): Promise<CaseConnectorActivity[]>;
    private createCaseConnectorInformation;
    private getPushDocs;
    private getTopHitsDoc;
    private static buildConnectorInfoAggs;
    getAll(caseId: string): Promise<SavedObjectsFindResponse<CaseUserActionDeprecatedResponse>>;
    getUserActionIdsForCases(caseIds: string[]): Promise<string[]>;
    getUniqueConnectors({ caseId, filter, }: {
        caseId: string;
        filter?: KueryNode;
    }): Promise<Array<{
        id: string;
    }>>;
    private buildCountConnectorsAggs;
    getMultipleCasesUserActionsTotal({ caseIds, }: {
        caseIds: string[];
    }): Promise<Record<string, number>>;
    private static buildMultipleCasesUserActionsTotalAgg;
    getCaseUserActionStats({ caseId }: {
        caseId: string;
    }): Promise<{
        total: number;
        total_deletions: number;
        total_comments: number;
        total_comment_deletions: number;
        total_comment_creations: number;
        total_hidden_comment_updates: number;
        total_other_actions: number;
        total_other_action_deletions: number;
    }>;
    private static buildUserActionStatsAgg;
    getUsers({ caseId }: {
        caseId: string;
    }): Promise<GetUsersResponse>;
    private static buildParticipantsAgg;
}
