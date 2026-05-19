import type { KueryNode } from '@kbn/es-query';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { FindOptions, ServiceContext } from '../types';
import type { UserActionSavedObjectTransformed, UserActionTransformedAttributes } from '../../../common/types/user_actions';
export declare class UserActionFinder {
    private readonly context;
    constructor(context: ServiceContext);
    find({ caseId, sortOrder, types, page, perPage, filter, }: FindOptions): Promise<SavedObjectsFindResponse<UserActionTransformedAttributes>>;
    private static buildFilter;
    private static buildFilterType;
    private static buildActionFilter;
    private static buildCommentTypeFilter;
    private static buildAlertCommentTypeFilter;
    private static buildAttachmentsFilter;
    private static buildGenericTypeFilter;
    findStatusChanges({ caseId, filter, }: {
        caseId: string;
        filter?: KueryNode;
    }): Promise<UserActionSavedObjectTransformed[]>;
}
