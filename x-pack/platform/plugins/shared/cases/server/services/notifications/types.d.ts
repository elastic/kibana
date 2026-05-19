import type { CaseAssignees } from '../../../common/types/domain';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
export interface NotifyAssigneesArgs {
    assignees: CaseAssignees;
    theCase: CaseSavedObjectTransformed;
}
export interface NotificationService {
    notifyAssignees: (args: NotifyAssigneesArgs) => Promise<void>;
    bulkNotifyAssignees: (args: NotifyAssigneesArgs[]) => Promise<void>;
}
