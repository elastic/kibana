import type { CaseAssignees } from '../../common/types/domain';
import type { CaseUserActionService } from '../services';
export declare const areTotalAssigneesInvalid: (assignees?: CaseAssignees) => boolean;
export declare const validateMaxUserActions: ({ caseId, userActionService, userActionsToAdd, }: {
    caseId: string;
    userActionService: CaseUserActionService;
    userActionsToAdd: number;
}) => Promise<void>;
