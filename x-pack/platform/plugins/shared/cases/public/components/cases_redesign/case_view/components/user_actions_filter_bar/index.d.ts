import React from 'react';
import type { CaseUserActionsStats } from '../../../../../containers/types';
import type { UserActivityParams } from '../../../../user_actions_activity_bar/types';
interface UserActionsFilterBarProps {
    caseId: string;
    params: UserActivityParams;
    userActionsStats?: CaseUserActionsStats;
    isLoading?: boolean;
    onParamsChange: (params: UserActivityParams) => void;
}
/**
 * Search + filter toolbar for the redesigned case activity tab. Mirrors the
 * layout of the attachments filter bar (`CaseViewAttachments`): a search
 * input followed by an `EuiFilterGroup` with type / author / sort filters,
 * and an optional "Clear filters" affordance below the toolbar. Unlike the
 * attachments filter, search and filtering here are performed server-side by
 * the user_actions `_find` endpoint.
 */
export declare const UserActionsFilterBar: React.NamedExoticComponent<UserActionsFilterBarProps>;
export {};
