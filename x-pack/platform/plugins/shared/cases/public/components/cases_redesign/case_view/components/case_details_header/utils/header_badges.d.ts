import type { AppHeaderBadge } from '@kbn/app-header';
import type { CaseSeverity } from '../../../../../../../common/types/domain';
import { CaseStatuses } from '../../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../../common';
interface GetBadgesArgs {
    caseData: CaseUI;
    isStatusMenuDisabled: boolean;
    isSeverityMenuDisabled: boolean;
    onStatusChanged: (status: CaseStatuses) => void;
    onSeverityChanged: (severity: CaseSeverity) => void;
}
export declare const getBadges: ({ caseData, isStatusMenuDisabled, isSeverityMenuDisabled, onStatusChanged, onSeverityChanged, }: GetBadgesArgs) => AppHeaderBadge[];
export {};
