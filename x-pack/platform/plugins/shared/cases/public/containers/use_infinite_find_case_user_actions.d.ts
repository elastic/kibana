import type { InternalFindCaseUserActions, CaseUserActionTypeWithAll } from '../../common/ui/types';
import type { ServerError } from '../types';
export declare const useInfiniteFindCaseUserActions: (caseId: string, params: {
    type: CaseUserActionTypeWithAll;
    sortOrder: "asc" | "desc";
    perPage: number;
}, isEnabled: boolean) => import("@kbn/react-query").UseInfiniteQueryResult<InternalFindCaseUserActions, ServerError>;
export type UseInfiniteFindCaseUserActions = ReturnType<typeof useInfiniteFindCaseUserActions>;
