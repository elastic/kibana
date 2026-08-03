import { CaseStatuses } from '@kbn/cases-components';
import type { CaseUI } from '../../../../../../../common';
import type { UserActivityParams } from '../../../../../user_actions_activity_bar/types';
/**
 * Local-storage-backed activity filters/pagination, plus status and
 * description field-update orchestration. Other cases-level data (permissions,
 * connectors, case users, configuration, etc.) should be read from their own
 * hooks where they're actually needed instead of being funnelled through here.
 */
export declare const useCaseViewActivity: ({ caseData }: {
    caseData: CaseUI;
}) => {
    userActivityQueryParams: UserActivityParams;
    onUpdateField: ({ key, value, onSuccess, onError }: import("../../../../../case_view/types").OnUpdateFields) => void;
    isLoadingDescription: boolean;
    isStatusLoading: boolean;
    changeStatus: (status: CaseStatuses, closeReason?: string) => void;
    handleUserActivityParamsChanged: (params: UserActivityParams) => void;
};
