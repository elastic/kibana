import type { CasesFindRequestWithCustomFields, CasesFindResponse } from '../../../common/types/api';
import type { CasesClient, CasesClientArgs } from '..';
/**
 * Retrieves a case and optionally its comments via saved objects find.
 *
 * @ignore
 */
export declare const find: (params: CasesFindRequestWithCustomFields, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<CasesFindResponse>;
