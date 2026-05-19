import type { CasesSearchRequest, CasesFindResponse } from '../../../common/types/api';
import type { CasesClient, CasesClientArgs } from '..';
/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export declare const search: (params: CasesSearchRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<CasesFindResponse>;
