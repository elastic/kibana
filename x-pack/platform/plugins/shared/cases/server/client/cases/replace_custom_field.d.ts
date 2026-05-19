import type { CasesClient, CasesClientArgs } from '..';
import type { CustomFieldPutRequest } from '../../../common/types/api';
import type { CaseCustomField } from '../../../common/types/domain';
export interface ReplaceCustomFieldArgs {
    /**
     * The ID of a case
     */
    caseId: string;
    /**
     * The ID of a custom field to be updated
     */
    customFieldId: string;
    /**
     * value of custom field to update, case version
     */
    request: CustomFieldPutRequest;
}
/**
 * Updates the specified cases with new values
 *
 * @ignore
 */
export declare const replaceCustomField: ({ caseId, customFieldId, request }: ReplaceCustomFieldArgs, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<CaseCustomField>;
