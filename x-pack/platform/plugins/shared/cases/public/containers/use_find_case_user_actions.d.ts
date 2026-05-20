import type { CaseUserActionTypeWithAll, InternalFindCaseUserActions } from '../../common/ui/types';
import type { ServerError } from '../types';
export declare const useFindCaseUserActions: (caseId: string, params: {
    type: CaseUserActionTypeWithAll;
    sortOrder: "asc" | "desc";
    page: number;
    perPage: number;
}, isEnabled: boolean) => import("@kbn/react-query").UseQueryResult<InternalFindCaseUserActions, ServerError>;
export type UseFindCaseUserActions = ReturnType<typeof useFindCaseUserActions>;
