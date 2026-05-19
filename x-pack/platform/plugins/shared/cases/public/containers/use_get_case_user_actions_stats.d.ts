import type { ServerError } from '../types';
export declare const useGetCaseUserActionsStats: (caseId: string) => import("@kbn/react-query").UseQueryResult<{
    total: number;
    totalDeletions: number;
    totalComments: number;
    totalCommentDeletions: number;
    totalCommentCreations: number;
    totalHiddenCommentUpdates: number;
    totalOtherActions: number;
    totalOtherActionDeletions: number;
}, ServerError>;
export type UseGetCaseUserActionsStats = ReturnType<typeof useGetCaseUserActionsStats>;
