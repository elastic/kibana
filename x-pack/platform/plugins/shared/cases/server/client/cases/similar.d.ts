import type { CasesSimilarResponse, SimilarCasesSearchRequest } from '../../../common/types/api';
import type { CasesClient, CasesClientArgs } from '..';
/**
 * Retrieves cases similar to a given Case
 */
export declare const similar: (caseId: string, params: SimilarCasesSearchRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<CasesSimilarResponse>;
