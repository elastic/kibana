import type { CasesClient, CasesClientArgs } from '..';
import type { OperationDetails } from '../../authorization';
import type { CasePatchRequest, CasesPatchRequest, CasesPatchResponse } from '../../../common/types/api';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
export declare function getOperationsToAuthorize({ reopenedCases, changedAssignees, allCases, }: {
    reopenedCases: CasePatchRequest[];
    changedAssignees: CasePatchRequest[];
    allCases: CasePatchRequest[];
}): OperationDetails[];
export interface UpdateRequestWithOriginalCase {
    updateReq: CasePatchRequest;
    originalCase: CaseSavedObjectTransformed;
}
/**
 * Updates the specified cases with new values
 *
 * @ignore
 */
export declare const bulkUpdate: (cases: CasesPatchRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<CasesPatchResponse>;
