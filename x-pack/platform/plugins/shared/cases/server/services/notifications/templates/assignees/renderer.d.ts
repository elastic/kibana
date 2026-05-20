import { CaseStatuses, CaseSeverity } from '../../../../../common/types/domain';
import type { CaseSavedObjectTransformed } from '../../../../common/types/case';
export declare const getStatusColor: (status: CaseStatuses | null | undefined) => string;
export declare const getSeverityColor: (severity: CaseSeverity | null | undefined) => string;
export declare const assigneesTemplateRenderer: (caseData: CaseSavedObjectTransformed, caseUrl: string | null) => Promise<string>;
