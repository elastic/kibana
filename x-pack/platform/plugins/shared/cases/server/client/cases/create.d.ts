import type { Case } from '../../../common/types/domain';
import type { CasesClient, CasesClientArgs } from '..';
import type { CasePostRequest } from '../../../common/types/api';
/**
 * Creates a new case.
 *
 */
export declare const create: (data: CasePostRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<Case>;
